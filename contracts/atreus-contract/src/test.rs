#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, BytesN, Env};

#[test]
fn test_create_and_claim() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AtreusContract);
    let client = AtreusContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let token = Address::generate(&env);
    let id = BytesN::from_array(&env, &[1u8; 32]);
    let link_hash = BytesN::from_array(&env, &[2u8; 32]);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    let proof = Bytes::new(&env);
    client.claim_link(&link_hash, &recipient, &proof);
}

#[test]
fn test_double_claim_fails() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AtreusContract);
    let client = AtreusContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let token = Address::generate(&env);
    let id = BytesN::from_array(&env, &[1u8; 32]);
    let link_hash = BytesN::from_array(&env, &[2u8; 32]);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    let proof = Bytes::new(&env);
    client.claim_link(&link_hash, &recipient, &proof);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.claim_link(&link_hash, &recipient, &proof);
    }));
    assert!(result.is_err());
}

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    let contract_id = env.register_contract(None, AtreusContract);
    let client = AtreusContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let token = Address::generate(&env);
    let id = BytesN::from_array(&env, &[1u8; 32]);
    let link_hash = BytesN::from_array(&env, &[2u8; 32]);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(&id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    // Jump past expiry
    env.ledger().set_timestamp(expiry + 1);

    client.refund_link(&link_hash);
}
