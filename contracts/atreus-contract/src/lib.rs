#![no_std]
#![allow(deprecated)]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, vec, Address, Bytes, BytesN, Env,
    IntoVal, Symbol, Val,
};

const STORAGE_TTL_THRESHOLD: u32 = 535_679;
const STORAGE_TTL_EXTEND_TO: u32 = 535_679;

const CLAIM_DOMAIN: &[u8; 15] = b"ATREUS_CLAIM_V1";
const EMAIL_DOMAIN: &[u8; 15] = b"ATREUS_EMAIL_V1";

/// A Stellar strkey is always 56 ASCII characters.
const STRKEY_LEN: usize = 56;

fn recipient_strkey(recipient: &Address) -> [u8; STRKEY_LEN] {
    let s = recipient.to_string();
    if s.len() as usize != STRKEY_LEN {
        panic!("invalid recipient");
    }
    let mut out = [0u8; STRKEY_LEN];
    s.copy_into_slice(&mut out);
    out
}

/// sha256(domain || link_hash || recipient_strkey || tail || salt). The attester
/// computes the same value off-chain, so no argument or event ever joins
/// `link_hash` to `recipient` on-chain.
fn blinded_key(
    env: &Env,
    domain: &[u8; 15],
    link_hash: &BytesN<32>,
    strkey: &[u8; STRKEY_LEN],
    tail: Option<&[u8; 32]>,
    salt: &BytesN<32>,
) -> BytesN<32> {
    let mut preimage = Bytes::new(env);
    preimage.extend_from_array(domain);
    preimage.extend_from_array(&link_hash.to_array());
    preimage.extend_from_array(strkey);
    if let Some(tail) = tail {
        preimage.extend_from_array(tail);
    }
    preimage.extend_from_array(&salt.to_array());
    BytesN::from_array(env, &env.crypto().sha256(&preimage).to_array())
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub asset: Address,
    pub policy_type: u32,
    pub policy_params: Bytes,
    pub expires_at: u64,
    pub claimed: bool,
}

#[contracttype]
pub enum DataKey {
    VerifierAddress,
}

#[contract]
pub struct AtreusContract;

#[contractimpl]
impl AtreusContract {
    pub fn __constructor(env: Env, verifier: Address) {
        env.storage()
            .instance()
            .set(&DataKey::VerifierAddress, &verifier);
        env.storage()
            .instance()
            .extend_ttl(STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);
    }

    pub fn create_link(
        env: Env,
        id: BytesN<32>,
        policy_type: u32,
        policy_params: Bytes,
        amount: i128,
        asset: Address,
        expiry: u64,
        sender: Address,
    ) {
        sender.require_auth();

        if env.storage().persistent().has(&id) {
            panic!("link already exists");
        }

        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        let link_info = LinkInfo {
            creator: sender.clone(),
            amount,
            asset: asset.clone(),
            policy_type,
            policy_params,
            expires_at: expiry,
            claimed: false,
        };

        env.storage().persistent().set(&id, &link_info);
        env.storage()
            .persistent()
            .extend_ttl(&id, STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);

        env.events()
            .publish((symbol_short!("created"), id), (sender, amount, asset));
    }

    pub fn claim_link(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        claim_salt: BytesN<32>,
        relayer_address: Address,
        relayer_fee: i128,
    ) {
        // Soroban authorizes the complete invocation, including relayer_address
        // and relayer_fee. This makes the recipient's signature an explicit
        // approval of the exact compensation paid for this gasless claim.
        recipient.require_auth();

        // No plaintext secret here: transaction arguments are public, so passing
        // the secret would publish it on-chain. The ZK attestation below already
        // proves the claimer knows it.
        let strkey = recipient_strkey(&recipient);
        let claim_key = blinded_key(&env, CLAIM_DOMAIN, &link_hash, &strkey, None, &claim_salt);

        let mut link_info: LinkInfo = env
            .storage()
            .persistent()
            .get(&link_hash)
            .expect("Link not found");

        // Retrieve verifier early — needed by both the ZK attestation check and the
        // email-restricted policy check below.
        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::VerifierAddress)
            .expect("verifier not set");

        // If policy_type == 1 (email-restricted), verify the claimer's email
        // through the attestation system, not a plaintext argument. policy_params
        // holds the 32-byte email hash; the trusted attester must have recorded an
        // attestation under the matching blinded email key.
        if link_info.policy_type == 1 {
            if link_info.policy_params.len() != 32 {
                panic!("invalid policy params length");
            }
            let mut policy_arr = [0u8; 32];
            link_info.policy_params.copy_into_slice(&mut policy_arr);
            let email_key = blinded_key(
                &env,
                EMAIL_DOMAIN,
                &link_hash,
                &strkey,
                Some(&policy_arr),
                &claim_salt,
            );
            let email_args: soroban_sdk::Vec<Val> = vec![&env, email_key.into_val(&env)];
            let email_attested: bool = env.invoke_contract(
                &verifier,
                &Symbol::new(&env, "is_email_attested"),
                email_args,
            );
            if !email_attested {
                panic!("email not attested for this recipient");
            }
        }

        // Require a real ZK attestation for this claim before releasing funds. The
        // attestation is only recorded by VerifierContract::attest() after a trusted
        // attester has verified a real UltraHonk proof off-chain — see the doc comment
        // on VerifierContract::verify_proof for why this indirection exists.
        let args: soroban_sdk::Vec<Val> = vec![&env, claim_key.into_val(&env)];
        let attested: bool =
            env.invoke_contract(&verifier, &Symbol::new(&env, "is_attested"), args);
        if !attested {
            panic!("no valid ZK attestation for this claim");
        }

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() > link_info.expires_at {
            panic!("link expired");
        }

        // The `claimed` flag above is the double-claim guard; the old sha256(link_hash)
        // nullifier key was derivable by anyone and leaked which links were claimed.
        // Replay protection across proofs lives in VerifierContract's nullifier registry.

        // Token transfers accept signed amounts, so reject both negative fees and
        // fees that would leave the recipient with a negative payout.
        if relayer_fee < 0 || relayer_fee > link_info.amount {
            panic!("invalid relayer fee");
        }
        let recipient_amount = link_info.amount - relayer_fee;

        let token_client = token::Client::new(&env, &link_info.asset);
        if relayer_fee > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &relayer_address,
                &relayer_fee,
            );
        }
        token_client.transfer(
            &env.current_contract_address(),
            &recipient,
            &recipient_amount,
        );

        link_info.claimed = true;
        env.storage().persistent().set(&link_hash, &link_info);

        // Topic and data carry nothing: any field here would let the link creator
        // watch the chain and learn who claimed which link, and for how much.
        env.events().publish((symbol_short!("claimed"),), ());
    }

    pub fn refund_link(env: Env, link_hash: BytesN<32>) {
        let link_info: LinkInfo = env
            .storage()
            .persistent()
            .get(&link_hash)
            .expect("Link not found");

        link_info.creator.require_auth();

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() <= link_info.expires_at {
            panic!("not yet expired");
        }

        let token_client = token::Client::new(&env, &link_info.asset);
        token_client.transfer(
            &env.current_contract_address(),
            &link_info.creator,
            &link_info.amount,
        );

        env.storage().persistent().remove(&link_hash);

        env.events().publish(
            (symbol_short!("refunded"), link_hash),
            (link_info.creator, link_info.amount),
        );
    }
}

mod test;
