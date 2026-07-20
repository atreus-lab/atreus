#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Ledger, MockAuth, MockAuthInvoke},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Bytes, BytesN, Env, IntoVal, Symbol,
};

// Minimal mock verifier that always returns true for is_attested
#[contract]
pub struct MockVerifier;

#[contractimpl]
impl MockVerifier {
    pub fn __constructor(env: Env, _vk: Bytes, _attester: Address) {
        env.storage().instance().set(&Symbol::new(&env, "init"), &true);
    }

    pub fn is_attested(_env: Env, _link_hash: BytesN<32>, _recipient: Address) -> bool {
        true
    }
}

fn setup_test(env: &Env) -> (AtreusContractClient<'_>, Address, Address) {
    let verifier: Address = env.register(MockVerifier, (Bytes::new(env), Address::generate(env)));
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

fn no_relayer(env: &Env) -> (Address, i128) {
    (Address::generate(env), 0)
}

fn empty_email_hash(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}

fn email_hash(env: &Env, email: &str) -> BytesN<32> {
    let email_bytes = Bytes::from_slice(env, email.as_bytes());
    let hash = env.crypto().sha256(&email_bytes);
    BytesN::from_array(env, &hash.to_array())
}

#[test]
fn test_email_restricted_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let intended_email = "alice@example.com";
    let intended_hash = email_hash(&env, intended_email);
    let policy_params = Bytes::from_array(&env, &intended_hash.to_array());

    // Create link with email restriction (policy_type=1)
    client.create_link(&link_hash, &1u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);

    let (relayer, fee) = no_relayer(&env);

    // Try claiming with wrong email hash — should fail
    let wrong_hash = email_hash(&env, "bob@example.com");
    assert!(client.try_claim_link(&link_hash, &recipient, &secret, &wrong_hash, &relayer, &fee).is_err());

    // Claim with correct email hash — should succeed
    client.claim_link(&link_hash, &recipient, &secret, &intended_hash, &relayer, &fee);
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
    let (relayer, fee) = no_relayer(&env);
    client.claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env), &relayer, &fee);
}

#[test]
fn test_claim_pays_fee_bound_relayer_and_remainder_to_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 2);
    let amount = 1000i128;
    let relayer_fee = 125i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);
    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    let relayer = Address::generate(&env);
    let recipient_email_hash = empty_email_hash(&env);

    client
        .mock_auths(&[MockAuth {
            address: &recipient,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "claim_link",
                args: (
                    link_hash.clone(),
                    recipient.clone(),
                    secret.clone(),
                    recipient_email_hash.clone(),
                    relayer.clone(),
                    relayer_fee,
                )
                    .into_val(&env),
                sub_invokes: &[],
            },
        }])
        .claim_link(
            &link_hash,
            &recipient,
            &secret,
            &recipient_email_hash,
            &relayer,
            &relayer_fee,
        );

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), amount - relayer_fee);
    assert_eq!(token_client.balance(&relayer), relayer_fee);
}

#[test]
fn test_claim_rejects_tampered_fee_not_covered_by_user_authorization() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 4);
    let amount = 1000i128;
    let signed_fee = 125i128;
    let tampered_fee = 126i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);
    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    let relayer = Address::generate(&env);
    let recipient_email_hash = empty_email_hash(&env);

    assert!(client
        .mock_auths(&[MockAuth {
            address: &recipient,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "claim_link",
                args: (
                    link_hash.clone(),
                    recipient.clone(),
                    secret.clone(),
                    recipient_email_hash.clone(),
                    relayer.clone(),
                    signed_fee,
                )
                    .into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_claim_link(
            &link_hash,
            &recipient,
            &secret,
            &recipient_email_hash,
            &relayer,
            &tampered_fee,
        )
        .is_err());

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), 0);
    assert_eq!(token_client.balance(&relayer), 0);
}

#[test]
fn test_claim_rejects_fee_greater_than_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 3);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);
    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    let relayer = Address::generate(&env);
    assert!(client
        .try_claim_link(
            &link_hash,
            &recipient,
            &secret,
            &empty_email_hash(&env),
            &relayer,
            &(amount + 1),
        )
        .is_err());
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
    let (relayer, fee) = no_relayer(&env);
    assert!(client.try_claim_link(&link_hash, &recipient, &wrong_secret, &empty_email_hash(&env), &relayer, &fee).is_err());
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
    let (relayer, fee) = no_relayer(&env);
    client.claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env), &relayer, &fee);

    assert!(client.try_claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env), &relayer, &fee).is_err());
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
    let (relayer, fee) = no_relayer(&env);
    assert!(client.try_claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env), &relayer, &fee).is_err());
}

#[test]
fn test_duplicate_link_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let (_secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    // First create should succeed
    client.create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    // Second create with same ID should fail
    assert!(client.try_create_link(&link_hash, &0u32, &policy_params, &amount, &token, &expiry, &sender).is_err());
}
