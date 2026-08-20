#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, testutils::Ledger, token::StellarAssetClient,
    Address, Bytes, BytesN, Env, Symbol,
};

// Minimal mock verifier that always returns true for is_attested
#[contract]
pub struct MockVerifier;

#[contractimpl]
impl MockVerifier {
    pub fn __constructor(env: Env, _vk: Bytes, _attester: Address) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "init"), &true);
    }

    pub fn is_attested(_env: Env, _link_hash: BytesN<32>, _recipient: Address) -> bool {
        true
    }

    pub fn is_email_attested(
        _env: Env,
        _link_hash: BytesN<32>,
        _recipient: Address,
        _email_hash: BytesN<32>,
    ) -> bool {
        true
    }
}

// Minimal mock Soroswap router
#[contract]
pub struct MockRouter;

#[contractimpl]
impl MockRouter {
    pub fn swap_exact_tokens_for_tokens(
        env: Env,
        amount_in: i128,
        _amount_out_min: i128,
        path: soroban_sdk::Vec<Address>,
        to: Address,
        _deadline: u64,
    ) -> soroban_sdk::Vec<i128> {
        let rate: i128 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "rate"))
            .unwrap_or(95);
        let out_amount = (amount_in * rate) / 100;
        let token_out = path.get(path.len() - 1).unwrap();
        let token_admin = StellarAssetClient::new(&env, &token_out);
        token_admin.mint(&to, &out_amount);

        let mut amounts = soroban_sdk::Vec::new(&env);
        amounts.push_back(amount_in);
        amounts.push_back(out_amount);
        amounts
    }

    pub fn set_rate(env: Env, rate: i128) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "rate"), &rate);
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
    client.create_link(
        &link_hash,
        &1u32,
        &policy_params,
        &amount,
        &token,
        &expiry,
        &sender,
    );

    let recipient = Address::generate(&env);

    // Claim with correct email hash — mock verifier returns true for is_email_attested
    client.claim_link(&link_hash, &recipient, &secret, &intended_hash);
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

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token,
        &expiry,
        &sender,
    );

    let recipient = Address::generate(&env);
    client.claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env));
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

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token,
        &expiry,
        &sender,
    );

    let recipient = Address::generate(&env);
    assert!(client
        .try_claim_link(
            &link_hash,
            &recipient,
            &wrong_secret,
            &empty_email_hash(&env)
        )
        .is_err());
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

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token,
        &expiry,
        &sender,
    );

    let recipient = Address::generate(&env);
    client.claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env));

    assert!(client
        .try_claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env))
        .is_err());
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

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token,
        &expiry,
        &sender,
    );

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

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token,
        &expiry,
        &sender,
    );

    env.ledger().set_timestamp(expiry + 1);

    let recipient = Address::generate(&env);
    assert!(client
        .try_claim_link(&link_hash, &recipient, &secret, &empty_email_hash(&env))
        .is_err());
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
    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token,
        &expiry,
        &sender,
    );

    // Second create with same ID should fail
    assert!(client
        .try_create_link(
            &link_hash,
            &0u32,
            &policy_params,
            &amount,
            &token,
            &expiry,
            &sender
        )
        .is_err());
}

#[test]
fn test_claim_and_swap_success() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let (client, sender, token_in) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token_in,
        &expiry,
        &sender,
    );

    let router_id = env.register(MockRouter, ());
    let token_out_admin = env.register_stellar_asset_contract_v2(sender.clone());
    let token_out = token_out_admin.address();

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let min_amount_out = 900i128;
    let deadline = expiry;
    let correlation_id = BytesN::from_array(&env, &[42u8; 32]);

    let amounts = client.claim_and_swap_link(
        &link_hash,
        &recipient,
        &secret,
        &empty_email_hash(&env),
        &router_id,
        &path,
        &min_amount_out,
        &deadline,
        &correlation_id,
    );

    assert_eq!(amounts.len(), 2);
    assert_eq!(amounts.get(0).unwrap(), 1000i128);
    assert_eq!(amounts.get(1).unwrap(), 950i128); // 95% default mock rate

    let out_client = token::Client::new(&env, &token_out);
    assert_eq!(out_client.balance(&recipient), 950i128);

    // Verify double-claim fails
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &recipient,
            &secret,
            &empty_email_hash(&env),
            &router_id,
            &path,
            &min_amount_out,
            &deadline,
            &correlation_id,
        )
        .is_err());
}

#[test]
fn test_claim_and_swap_slippage_panic_reverts_state_and_nullifier() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let (client, sender, token_in) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token_in,
        &expiry,
        &sender,
    );

    let router_id = env.register(MockRouter, ());
    let router_client = MockRouterClient::new(&env, &router_id);
    router_client.set_rate(&80i128); // 80% output rate = 800 tokens

    let token_out_admin = env.register_stellar_asset_contract_v2(sender.clone());
    let token_out = token_out_admin.address();

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let min_amount_out = 900i128; // Requires 900, but router only gives 800
    let deadline = expiry;
    let correlation_id = BytesN::from_array(&env, &[42u8; 32]);

    // Slippage violation triggers panic! which triggers Soroban's native rollback
    let result = client.try_claim_and_swap_link(
        &link_hash,
        &recipient,
        &secret,
        &empty_email_hash(&env),
        &router_id,
        &path,
        &min_amount_out,
        &deadline,
        &correlation_id,
    );
    assert!(result.is_err());

    // Because state reverted cleanly without burning nullifier, a retry with acceptable min_amount_out succeeds!
    let retry_min_amount_out = 750i128;
    let amounts = client.claim_and_swap_link(
        &link_hash,
        &recipient,
        &secret,
        &empty_email_hash(&env),
        &router_id,
        &path,
        &retry_min_amount_out,
        &deadline,
        &correlation_id,
    );

    assert_eq!(amounts.get(1).unwrap(), 800i128);
    let out_client = token::Client::new(&env, &token_out);
    assert_eq!(out_client.balance(&recipient), 800i128);
}

#[test]
fn test_claim_and_swap_wrong_secret_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token_in) = setup_test(&env);
    let (_secret, link_hash) = make_secret(&env, 1);
    let (wrong_secret, _) = make_secret(&env, 99);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token_in,
        &expiry,
        &sender,
    );

    let router_id = env.register(MockRouter, ());
    let token_out_admin = env.register_stellar_asset_contract_v2(sender.clone());
    let token_out = token_out_admin.address();

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let min_amount_out = 900i128;
    let deadline = expiry;
    let correlation_id = BytesN::from_array(&env, &[42u8; 32]);

    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &recipient,
            &wrong_secret,
            &empty_email_hash(&env),
            &router_id,
            &path,
            &min_amount_out,
            &deadline,
            &correlation_id,
        )
        .is_err());
}

#[test]
fn test_claim_and_swap_expired_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token_in) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token_in,
        &expiry,
        &sender,
    );

    env.ledger().set_timestamp(expiry + 1);

    let router_id = env.register(MockRouter, ());
    let token_out_admin = env.register_stellar_asset_contract_v2(sender.clone());
    let token_out = token_out_admin.address();

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let min_amount_out = 900i128;
    let deadline = expiry;
    let correlation_id = BytesN::from_array(&env, &[42u8; 32]);

    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &recipient,
            &secret,
            &empty_email_hash(&env),
            &router_id,
            &path,
            &min_amount_out,
            &deadline,
            &correlation_id,
        )
        .is_err());
}

#[test]
fn test_claim_and_swap_invalid_path_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token_in) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(
        &link_hash,
        &0u32,
        &policy_params,
        &amount,
        &token_in,
        &expiry,
        &sender,
    );

    let router_id = env.register(MockRouter, ());
    let token_out_admin = env.register_stellar_asset_contract_v2(sender.clone());
    let token_out = token_out_admin.address();

    let recipient = Address::generate(&env);
    let deadline = expiry;
    let correlation_id = BytesN::from_array(&env, &[42u8; 32]);

    // Path starting with wrong token
    let invalid_path = vec![&env, token_out.clone(), token_in.clone()];
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &recipient,
            &secret,
            &empty_email_hash(&env),
            &router_id,
            &invalid_path,
            &900i128,
            &deadline,
            &correlation_id,
        )
        .is_err());

    // Empty or single-token path
    let single_path = vec![&env, token_in.clone()];
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &recipient,
            &secret,
            &empty_email_hash(&env),
            &router_id,
            &single_path,
            &900i128,
            &deadline,
            &correlation_id,
        )
        .is_err());
}
