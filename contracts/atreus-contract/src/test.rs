#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _, testutils::Ledger, token::StellarAssetClient, Address, Bytes,
    BytesN, Env,
};

fn setup_test(env: &Env) -> (AtreusContractClient<'_>, Address, Address) {
    let verifier = Address::generate(env);
    let contract_id = env.register(AtreusContract, (&verifier,));
    let client = AtreusContractClient::new(env, &contract_id);

    let sender = Address::generate(env);
    let token = env.register_stellar_asset_contract_v2(sender.clone());
    let token_addr = token.address();
    let token_admin = StellarAssetClient::new(env, &token_addr);
    token_admin.mint(&sender, &10000i128);

    (client, sender, token_addr)
}

fn make_secret(env: &Env, val: u8) -> (BytesN<32>, BytesN<32>) {
    let secret = BytesN::from_array(env, &[val; 32]);
    let secret_bytes = Bytes::from_array(env, &secret.to_array());
    let hash = env.crypto().sha256(&secret_bytes);
    let link_hash = BytesN::from_array(env, &hash.to_array());
    (secret, link_hash)
}

#[test]
fn test_create_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    client.claim_link(&link_hash, &recipient, &secret);
}

#[test]
fn test_wrong_secret_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (_secret, link_hash) = make_secret(&env, 1);
    let (wrong_secret, _) = make_secret(&env, 99);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    assert!(client.try_claim_link(&link_hash, &recipient, &wrong_secret).is_err());
}

#[test]
fn test_double_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    client.claim_link(&link_hash, &recipient, &secret);

    assert!(client.try_claim_link(&link_hash, &recipient, &secret).is_err());
}

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (_secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    env.ledger().set_timestamp(expiry + 1);
    client.refund_link(&link_hash);
}

#[test]
fn test_claim_expired_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    env.ledger().set_timestamp(expiry + 1);

    let recipient = Address::generate(&env);
    assert!(client.try_claim_link(&link_hash, &recipient, &secret).is_err());
}
