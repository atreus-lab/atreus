#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, Address, Bytes, BytesN, Env};

fn setup_test(env: &Env) -> (AtreusContractClient, Address, Address) {
    let contract_id = env.register_contract(None, AtreusContract);
    let client = AtreusContractClient::new(env, &contract_id);

    let sender = Address::generate(env);
    let token = env.register_stellar_asset_contract(sender.clone());
    let token_admin = StellarAssetClient::new(env, &token);
    token_admin.mint(&sender, &10000i128);

    (client, sender, token)
}

fn dummy_proof(env: &Env) -> Bytes {
    Bytes::from_array(env, &[1u8; 32])
}

#[test]
fn test_create_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let id = BytesN::from_array(&env, &[1u8; 32]);
    let link_hash = BytesN::from_array(&env, &[2u8; 32]);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    let proof = dummy_proof(&env);
    client.claim_link(&link_hash, &recipient, &proof);
}

#[test]
fn test_double_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let id = BytesN::from_array(&env, &[1u8; 32]);
    let link_hash = BytesN::from_array(&env, &[2u8; 32]);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    let proof = dummy_proof(&env);
    client.claim_link(&link_hash, &recipient, &proof);

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.claim_link(&link_hash, &recipient, &proof);
    }));
    assert!(result.is_err());
}

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let id = BytesN::from_array(&env, &[1u8; 32]);
    let link_hash = BytesN::from_array(&env, &[2u8; 32]);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(&id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    env.ledger().set_timestamp(expiry + 1);
    client.refund_link(&link_hash);
}

#[test]
fn test_claim_expired_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let id = BytesN::from_array(&env, &[1u8; 32]);
    let link_hash = BytesN::from_array(&env, &[2u8; 32]);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(&id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    env.ledger().set_timestamp(expiry + 1);

    let recipient = Address::generate(&env);
    let proof = dummy_proof(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.claim_link(&link_hash, &recipient, &proof);
    }));
    assert!(result.is_err());
}
