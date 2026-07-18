#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, vec, Address, Bytes, BytesN, Env, IntoVal, Symbol, Val, symbol_short};

const STORAGE_TTL_THRESHOLD: u32 = 535_679;
const STORAGE_TTL_EXTEND_TO: u32 = 535_679;

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
        env.storage().instance().set(&DataKey::VerifierAddress, &verifier);
        env.storage().instance().extend_ttl(STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);
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
        env.storage().persistent().extend_ttl(&id, STORAGE_TTL_THRESHOLD, STORAGE_TTL_EXTEND_TO);

        env.events().publish(
            (symbol_short!("created"), id),
            (sender, amount, asset),
        );
    }

    pub fn claim_link(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        secret: BytesN<32>,
        recipient_email_hash: BytesN<32>,
        relayer_address: Address,
        relayer_fee: i128,
    ) {
        // Soroban authorizes the complete invocation, including relayer_address
        // and relayer_fee. This makes the recipient's signature an explicit
        // approval of the exact compensation paid for this gasless claim.
        recipient.require_auth();

        // Verify secret: sha256(secret) must equal the stored link_hash.
        let secret_bytes = Bytes::from_array(&env, &secret.to_array());
        let computed = env.crypto().sha256(&secret_bytes);
        if BytesN::from_array(&env, &computed.to_array()) != link_hash {
            panic!("invalid secret");
        }

        let mut link_info: LinkInfo = env.storage().persistent().get(&link_hash).expect("Link not found");

        // If policy_type == 1 (email-restricted), verify the claimer's email hash
        // matches the intended recipient's email hash stored at link creation.
        if link_info.policy_type == 1 {
            if link_info.policy_params.len() != 32 {
                panic!("invalid policy params length");
            }
            let recipient_email_bytes = Bytes::from_array(&env, &recipient_email_hash.to_array());
            if link_info.policy_params != recipient_email_bytes {
                panic!("recipient email does not match");
            }
        }

        // Require a real ZK attestation for this exact (link_hash, recipient) pair before
        // releasing funds. The attestation is only recorded by VerifierContract::attest()
        // after a trusted attester has verified a real UltraHonk proof off-chain — see the
        // doc comment on VerifierContract::verify_proof for why this indirection exists.
        let verifier: Address = env.storage().instance().get(&DataKey::VerifierAddress).expect("verifier not set");
        let args: soroban_sdk::Vec<Val> = vec![
            &env,
            link_hash.into_val(&env),
            recipient.into_val(&env),
        ];
        let attested: bool = env.invoke_contract(&verifier, &Symbol::new(&env, "is_attested"), args);
        if !attested {
            panic!("no valid ZK attestation for this claim");
        }

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() > link_info.expires_at {
            panic!("link expired");
        }

        // Double-claim prevention via nullifier
        let link_hash_bytes = Bytes::from_array(&env, &link_hash.to_array());
        let nullifier_key = BytesN::from_array(
            &env,
            &env.crypto().sha256(&link_hash_bytes).to_array(),
        );
        if env.storage().persistent().has(&nullifier_key) {
            panic!("nullifier already used");
        }

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
        env.storage().persistent().set(&nullifier_key, &true);

        env.events().publish(
            (symbol_short!("claimed"), link_hash),
            (recipient, recipient_amount, relayer_address, relayer_fee),
        );
    }

    pub fn refund_link(env: Env, link_hash: BytesN<32>) {
        let link_info: LinkInfo = env.storage().persistent().get(&link_hash).expect("Link not found");

        link_info.creator.require_auth();

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() <= link_info.expires_at {
            panic!("not yet expired");
        }

        let token_client = token::Client::new(&env, &link_info.asset);
        token_client.transfer(&env.current_contract_address(), &link_info.creator, &link_info.amount);

        env.storage().persistent().remove(&link_hash);

        env.events().publish(
            (symbol_short!("refunded"), link_hash),
            (link_info.creator, link_info.amount),
        );
    }
}

mod test;
