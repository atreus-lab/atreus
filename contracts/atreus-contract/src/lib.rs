#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Bytes, BytesN, Env, Symbol, symbol_short};

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

    pub fn claim_link(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        proof: Bytes,
    ) {
        recipient.require_auth();

        let mut link_info: LinkInfo = env.storage().persistent().get(&link_hash).expect("Link not found");

        if link_info.claimed {
            panic!("already claimed");
        }

        if env.ledger().timestamp() > link_info.expires_at {
            panic!("link expired");
        }

        // Double-claim prevention via nullifier
        let nullifier_key = BytesN::from_array(
            &env,
            &env.crypto().sha256(&link_hash.to_array()).to_array(),
        );
        if env.storage().temporary().has(&nullifier_key) {
            panic!("nullifier already used");
        }

        // Verify ZK proof via VerifierContract (deployed separately)
        // TODO: Replace with actual rs-soroban-ultrahonk cross-contract call:
        //   let verifier: Address = env.storage().instance().get(&DataKey::VerifierAddress).unwrap();
        //   let verified: bool = env.invoke_contract(&verifier, &Symbol::new(&env, "verify_proof"), &[proof.into()]);
        //   if !verified { panic!("invalid proof"); }
        if proof.is_empty() {
            panic!("invalid proof");
        }

        let token_client = token::Client::new(&env, &link_info.asset);
        token_client.transfer(&env.current_contract_address(), &recipient, &link_info.amount);

        link_info.claimed = true;
        env.storage().persistent().set(&link_hash, &link_info);
        env.storage().temporary().set(&nullifier_key, &true);

        env.events().publish(
            (symbol_short!("claimed"), link_hash),
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
