#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, vec, Address, Bytes, BytesN, Env, IntoVal, Symbol, Val, symbol_short};

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
    }

    /// Create an escrow payment link.
    ///
    /// `id` is `sha256(secret_bytes)` — the 32-byte SHA-256 hash of the off-chain
    /// secret. This serves as the on-chain storage key and is also the value embedded
    /// in the shareable URL. The raw secret stays off-chain at all times.
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

        env.events().publish(
            (symbol_short!("created"), id),
            (sender, amount, asset),
        );
    }

    /// Claim an escrow payment link.
    ///
    /// # Hash roles
    ///
    /// Two cryptographic hashes are involved in this system, and it is important not
    /// to confuse them:
    ///
    /// - **`link_id`** (`link_hash` parameter here) — `sha256(secret_bytes)`.  This is
    ///   the on-chain storage key used when the link was created. It is passed in by
    ///   the caller as the first argument and doubles as the lookup key.
    ///
    /// - **ZK circuit `link_hash`** — `pedersen_hash(secret_as_field)`.  This is the
    ///   public input used inside the Noir circuit to prove knowledge of the secret
    ///   without revealing it.  Pedersen is a ZK-friendly hash that lives only inside
    ///   the proof and is verified by the backend attester before the attestation is
    ///   recorded on-chain.
    ///
    /// # Why there is no SHA-256 secret re-check here
    ///
    /// The contract does **not** re-hash `secret` and compare it to `link_hash`.
    /// Requiring the raw secret on-chain would leak it in transaction history,
    /// defeating the zero-knowledge property.  Instead, proof-of-knowledge is
    /// established entirely through the ZK attestation:
    ///
    /// 1. The client generates an UltraHonk proof that `pedersen_hash(secret) == link_hash_pedersen`.
    /// 2. The backend attester verifies the proof off-chain and calls `VerifierContract::attest`.
    /// 3. This function checks `is_attested(link_id, recipient) == true` before releasing funds.
    ///
    /// The `link_id` lookup in storage implicitly ties the release to the correct link
    /// (wrong `link_id` → `Link not found` panic). No additional SHA-256 check is needed.
    pub fn claim_link(
        env: Env,
        link_id: BytesN<32>,
        recipient: Address,
        _recipient_email_hash: BytesN<32>,
    ) {
        recipient.require_auth();

        let mut link_info: LinkInfo = env.storage().persistent().get(&link_id).expect("Link not found");

        // Retrieve the verifier contract — needed for both ZK attestation and email policy checks.
        let verifier: Address = env.storage().instance().get(&DataKey::VerifierAddress).expect("verifier not set");

        // If policy_type == 1 (email-restricted), verify the claimer's email through the
        // attestation system. The trusted attester must have independently verified email
        // ownership and recorded an EmailAttestation for this (link_id, recipient, email_hash) triple.
        if link_info.policy_type == 1 {
            if link_info.policy_params.len() != 32 {
                panic!("invalid policy params length");
            }
            let mut policy_arr = [0u8; 32];
            link_info.policy_params.copy_into_slice(&mut policy_arr);
            let expected_email_hash = BytesN::from_array(&env, &policy_arr);
            let email_args: soroban_sdk::Vec<Val> = vec![
                &env,
                link_id.into_val(&env),
                recipient.into_val(&env),
                expected_email_hash.into_val(&env),
            ];
            let email_attested: bool = env.invoke_contract(
                &verifier,
                &Symbol::new(&env, "is_email_attested"),
                email_args,
            );
            if !email_attested {
                panic!("email not attested for this recipient");
            }
        }

        // Require a ZK attestation for this exact (link_id, recipient) pair before
        // releasing funds. The attestation is only recorded by VerifierContract::attest()
        // after a trusted attester has verified a real UltraHonk proof off-chain (the
        // Pedersen-based ZK proof inside the Noir circuit). See the doc comment above
        // for the full explanation of why this is the correct verification gate.
        let args: soroban_sdk::Vec<Val> = vec![
            &env,
            link_id.into_val(&env),
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

        // Double-claim prevention via nullifier derived from link_id
        let link_id_bytes = Bytes::from_array(&env, &link_id.to_array());
        let nullifier_key = BytesN::from_array(
            &env,
            &env.crypto().sha256(&link_id_bytes).to_array(),
        );
        if env.storage().persistent().has(&nullifier_key) {
            panic!("nullifier already used");
        }

        let token_client = token::Client::new(&env, &link_info.asset);
        token_client.transfer(&env.current_contract_address(), &recipient, &link_info.amount);

        link_info.claimed = true;
        env.storage().persistent().set(&link_id, &link_info);
        env.storage().persistent().set(&nullifier_key, &true);

        env.events().publish(
            (symbol_short!("claimed"), link_id),
            (recipient, link_info.amount),
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
