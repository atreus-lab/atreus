#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl, contracttype,
    testutils::{Address as _, Ledger, MockAuth, MockAuthInvoke},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Bytes, BytesN, Env, IntoVal, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum MockDataKey {
    EmailAttestation(BytesN<32>, Address, BytesN<32>),
}

// Minimal mock verifier: returns true for is_attested, but tracks email
// attestations like the real verifier-contract so email-restricted claims
// only succeed once the trusted attester has recorded an attestation.
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

    pub fn attest_email(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        email_hash: BytesN<32>,
    ) {
        env.storage().persistent().set(
            &MockDataKey::EmailAttestation(link_hash, recipient, email_hash),
            &true,
        );
    }

    pub fn is_email_attested(
        env: Env,
        link_hash: BytesN<32>,
        recipient: Address,
        email_hash: BytesN<32>,
    ) -> bool {
        env.storage()
            .persistent()
            .get(&MockDataKey::EmailAttestation(
                link_hash, recipient, email_hash,
            ))
            .unwrap_or(false)
    }
}

// Mock Soroswap Router: simulates swap_exact_tokens_for_tokens with slippage and deadline checks.
#[contract]
pub struct MockSoroswapRouter;

#[contractimpl]
impl MockSoroswapRouter {
    pub fn swap_exact_tokens_for_tokens(
        env: Env,
        amount_in: i128,
        amount_out_min: i128,
        path: Vec<Address>,
        to: Address,
        deadline: u64,
    ) -> Vec<i128> {
        if deadline < env.ledger().timestamp() {
            panic!("Router: EXPIRED");
        }

        if path.len() < 2 {
            panic!("Router: INVALID_PATH");
        }

        let output_asset = path.get(path.len() - 1).unwrap();

        // 1:1 simulated output amount
        let simulated_amount_out = amount_in;

        if simulated_amount_out < amount_out_min {
            panic!("Router: INSUFFICIENT_OUTPUT_AMOUNT");
        }

        let out_token = TokenClient::new(&env, &output_asset);
        out_token.transfer(&env.current_contract_address(), &to, &simulated_amount_out);

        let mut amounts = Vec::new(&env);
        amounts.push_back(amount_in);
        for _ in 1..path.len() - 1 {
            amounts.push_back(amount_in);
        }
        amounts.push_back(simulated_amount_out);
        amounts
    }
}

fn setup_test(env: &Env) -> (AtreusContractClient<'_>, Address, Address, Address) {
    let verifier: Address = env.register(MockVerifier, (Bytes::new(env), Address::generate(env)));
    let contract_id = env.register(AtreusContract, (&verifier,));
    let client = AtreusContractClient::new(env, &contract_id);

    let sender = Address::generate(env);
    let token = env.register_stellar_asset_contract_v2(sender.clone());
    let token_addr = token.address();
    let token_admin = StellarAssetClient::new(env, &token_addr);
    token_admin.mint(&sender, &10000i128);

    (client, verifier, sender, token_addr)
}

fn setup_swap_test(
    env: &Env,
) -> (
    AtreusContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
    let verifier: Address = env.register(MockVerifier, (Bytes::new(env), Address::generate(env)));
    let contract_id = env.register(AtreusContract, (&verifier,));
    let client = AtreusContractClient::new(env, &contract_id);

    let sender = Address::generate(env);
    let token_in = env.register_stellar_asset_contract_v2(sender.clone());
    let token_in_addr = token_in.address();
    let token_in_admin = StellarAssetClient::new(env, &token_in_addr);
    token_in_admin.mint(&sender, &10000i128);

    let token_out_admin_user = Address::generate(env);
    let token_out = env.register_stellar_asset_contract_v2(token_out_admin_user.clone());
    let token_out_addr = token_out.address();
    let token_out_admin = StellarAssetClient::new(env, &token_out_addr);

    let router: Address = env.register(MockSoroswapRouter, ());
    token_out_admin.mint(&router, &50000i128);

    (
        client,
        verifier,
        sender,
        token_in_addr,
        token_out_addr,
        router,
    )
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

    let (client, verifier, sender, token) = setup_test(&env);
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

    let (relayer, fee) = no_relayer(&env);

    // No email attestation recorded yet — claiming must fail
    let wrong_hash = email_hash(&env, "bob@example.com");
    assert!(client
        .try_claim_link(&link_hash, &recipient, &secret, &wrong_hash, &relayer, &fee)
        .is_err());

    // Trusted attester records the intended email binding
    let mock_verifier = MockVerifierClient::new(&env, &verifier);
    mock_verifier.attest_email(&link_hash, &recipient, &intended_hash);

    // Claim with correct email hash — should succeed
    client.claim_link(
        &link_hash,
        &recipient,
        &secret,
        &intended_hash,
        &relayer,
        &fee,
    );
}

#[test]
fn test_create_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
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
    let (relayer, fee) = no_relayer(&env);
    client.claim_link(
        &link_hash,
        &recipient,
        &secret,
        &empty_email_hash(&env),
        &relayer,
        &fee,
    );
}

#[test]
fn test_claim_pays_fee_bound_relayer_and_remainder_to_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 2);
    let amount = 1000i128;
    let relayer_fee = 125i128;
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

    let (client, _verifier, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 4);
    let amount = 1000i128;
    let signed_fee = 125i128;
    let tampered_fee = 126i128;
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

    let (client, _verifier, sender, token) = setup_test(&env);
    let (secret, link_hash) = make_secret(&env, 3);
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

    let (client, _verifier, sender, token) = setup_test(&env);
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
    let (relayer, fee) = no_relayer(&env);
    assert!(client
        .try_claim_link(
            &link_hash,
            &recipient,
            &wrong_secret,
            &empty_email_hash(&env),
            &relayer,
            &fee
        )
        .is_err());
}

#[test]
fn test_double_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
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
    let (relayer, fee) = no_relayer(&env);
    client.claim_link(
        &link_hash,
        &recipient,
        &secret,
        &empty_email_hash(&env),
        &relayer,
        &fee,
    );

    assert!(client
        .try_claim_link(
            &link_hash,
            &recipient,
            &secret,
            &empty_email_hash(&env),
            &relayer,
            &fee
        )
        .is_err());
}

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
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

    let (client, _verifier, sender, token) = setup_test(&env);
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
    let (relayer, fee) = no_relayer(&env);
    assert!(client
        .try_claim_link(
            &link_hash,
            &recipient,
            &secret,
            &empty_email_hash(&env),
            &relayer,
            &fee
        )
        .is_err());
}

#[test]
fn test_duplicate_link_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
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
    env.mock_all_auths();

    let (client, _verifier, sender, token_in, token_out, router) = setup_swap_test(&env);
    let (secret, link_hash) = make_secret(&env, 10);
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

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let min_amount_out = 950i128;
    let deadline = env.ledger().timestamp() + 500;

    let amounts = client.claim_and_swap_link(
        &link_hash,
        &secret,
        &recipient,
        &router,
        &path,
        &min_amount_out,
        &deadline,
        &0i128,
        &None,
    );

    assert_eq!(amounts.len(), 2);
    assert_eq!(amounts.get(0).unwrap(), 1000i128);
    assert_eq!(amounts.get(1).unwrap(), 1000i128);

    let token_out_client = TokenClient::new(&env, &token_out);
    let token_in_client = TokenClient::new(&env, &token_in);

    assert_eq!(token_out_client.balance(&recipient), 1000i128);
    assert_eq!(token_in_client.balance(&recipient), 0i128);
    assert_eq!(token_in_client.balance(&router), 1000i128);

    // Assert link is marked claimed and cannot be claimed again
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &secret,
            &recipient,
            &router,
            &path,
            &min_amount_out,
            &deadline,
            &0i128,
            &None,
        )
        .is_err());
}

#[test]
fn test_claim_and_swap_multi_hop_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token_in, token_out, router) = setup_swap_test(&env);

    let token_mid_admin = Address::generate(&env);
    let token_mid = env.register_stellar_asset_contract_v2(token_mid_admin.clone());
    let token_mid_addr = token_mid.address();

    let (secret, link_hash) = make_secret(&env, 11);
    let amount = 2500i128;
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

    let recipient = Address::generate(&env);
    let path = vec![
        &env,
        token_in.clone(),
        token_mid_addr.clone(),
        token_out.clone(),
    ];
    let min_amount_out = 2000i128;
    let deadline = env.ledger().timestamp() + 500;

    let amounts = client.claim_and_swap_link(
        &link_hash,
        &secret,
        &recipient,
        &router,
        &path,
        &min_amount_out,
        &deadline,
        &0i128,
        &None,
    );

    assert_eq!(amounts.len(), 3);
    assert_eq!(amounts.get(2).unwrap(), 2500i128);

    let token_out_client = TokenClient::new(&env, &token_out);
    assert_eq!(token_out_client.balance(&recipient), 2500i128);
}

#[test]
fn test_claim_and_swap_slippage_revert() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token_in, token_out, router) = setup_swap_test(&env);
    let (secret, link_hash) = make_secret(&env, 12);
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

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    // Slippage expectation is higher than simulated output (1500 > 1000)
    let min_amount_out = 1500i128;
    let deadline = env.ledger().timestamp() + 500;

    let result = client.try_claim_and_swap_link(
        &link_hash,
        &secret,
        &recipient,
        &router,
        &path,
        &min_amount_out,
        &deadline,
        &0i128,
        &None,
    );

    assert!(result.is_err());

    let token_out_client = TokenClient::new(&env, &token_out);
    let token_in_client = TokenClient::new(&env, &token_in);

    // Verify state was completely rolled back
    assert_eq!(token_out_client.balance(&recipient), 0);
    assert_eq!(token_in_client.balance(&recipient), 0);
    assert_eq!(token_in_client.balance(&router), 0);
    assert_eq!(token_in_client.balance(&client.address), 1000i128);

    // Verify link remains claimable with acceptable slippage
    let success_amounts = client.claim_and_swap_link(
        &link_hash, &secret, &recipient, &router, &path, &1000i128, &deadline, &0i128, &None,
    );
    assert_eq!(success_amounts.get(1).unwrap(), 1000i128);
    assert_eq!(token_out_client.balance(&recipient), 1000i128);
}

#[test]
fn test_claim_and_swap_expired_deadline_revert() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(100);

    let (client, _verifier, sender, token_in, token_out, router) = setup_swap_test(&env);
    let (secret, link_hash) = make_secret(&env, 13);
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

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let min_amount_out = 900i128;
    // Deadline is set in the past relative to current ledger timestamp (100)
    let expired_deadline = 50u64;

    let result = client.try_claim_and_swap_link(
        &link_hash,
        &secret,
        &recipient,
        &router,
        &path,
        &min_amount_out,
        &expired_deadline,
        &0i128,
        &None,
    );

    assert!(result.is_err());
}

#[test]
fn test_claim_and_swap_invalid_path_revert() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token_in, token_out, router) = setup_swap_test(&env);
    let (secret, link_hash) = make_secret(&env, 14);
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

    let recipient = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 500;

    // 1. Path not starting with escrowed token (starts with token_out)
    let wrong_start_path = vec![&env, token_out.clone(), token_in.clone()];
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &secret,
            &recipient,
            &router,
            &wrong_start_path,
            &900i128,
            &deadline,
            &0i128,
            &None,
        )
        .is_err());

    // 2. Path ending with escrowed token (same asset)
    let same_target_path = vec![&env, token_in.clone(), token_in.clone()];
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &secret,
            &recipient,
            &router,
            &same_target_path,
            &900i128,
            &deadline,
            &0i128,
            &None,
        )
        .is_err());

    // 3. Path with fewer than 2 items
    let short_path = vec![&env, token_in.clone()];
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &secret,
            &recipient,
            &router,
            &short_path,
            &900i128,
            &deadline,
            &0i128,
            &None,
        )
        .is_err());
}

#[test]
fn test_claim_and_swap_with_relayer_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token_in, token_out, router) = setup_swap_test(&env);
    let (secret, link_hash) = make_secret(&env, 15);
    let amount = 1000i128;
    let relayer_fee = 150i128;
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

    let recipient = Address::generate(&env);
    let relayer = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let min_amount_out = 800i128;
    let deadline = env.ledger().timestamp() + 500;

    let amounts = client.claim_and_swap_link(
        &link_hash,
        &secret,
        &recipient,
        &router,
        &path,
        &min_amount_out,
        &deadline,
        &relayer_fee,
        &Some(relayer.clone()),
    );

    let expected_swap_amount = amount - relayer_fee; // 850
    assert_eq!(amounts.get(0).unwrap(), expected_swap_amount);
    assert_eq!(amounts.get(1).unwrap(), expected_swap_amount);

    let token_in_client = TokenClient::new(&env, &token_in);
    let token_out_client = TokenClient::new(&env, &token_out);

    // Relayer receives exact fee in token_in
    assert_eq!(token_in_client.balance(&relayer), relayer_fee);
    // Recipient receives swapped output in token_out
    assert_eq!(token_out_client.balance(&recipient), expected_swap_amount);
    // Recipient receives no input token
    assert_eq!(token_in_client.balance(&recipient), 0);
    // Router received the swap amount in token_in
    assert_eq!(token_in_client.balance(&router), expected_swap_amount);
}

#[test]
fn test_claim_and_swap_rejects_invalid_relayer_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token_in, token_out, router) = setup_swap_test(&env);
    let (secret, link_hash) = make_secret(&env, 16);
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

    let recipient = Address::generate(&env);
    let relayer = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let deadline = env.ledger().timestamp() + 500;

    // 1. Fee greater than total link amount
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &secret,
            &recipient,
            &router,
            &path,
            &100i128,
            &deadline,
            &(amount + 1),
            &Some(relayer.clone()),
        )
        .is_err());

    // 2. Fee equals total amount (leaves 0 for swap)
    assert!(client
        .try_claim_and_swap_link(
            &link_hash,
            &secret,
            &recipient,
            &router,
            &path,
            &100i128,
            &deadline,
            &amount,
            &Some(relayer.clone()),
        )
        .is_err());

    // 3. Positive fee with None for relayer_address
    assert!(client
        .try_claim_and_swap_link(
            &link_hash, &secret, &recipient, &router, &path, &100i128, &deadline, &100i128, &None,
        )
        .is_err());
}

#[test]
fn test_claim_and_swap_email_restricted() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token_in, token_out, router) = setup_swap_test(&env);
    let (secret, link_hash) = make_secret(&env, 17);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let intended_email = "swapuser@example.com";
    let intended_hash = email_hash(&env, intended_email);
    let policy_params = Bytes::from_array(&env, &intended_hash.to_array());

    client.create_link(
        &link_hash,
        &1u32,
        &policy_params,
        &amount,
        &token_in,
        &expiry,
        &sender,
    );

    let recipient = Address::generate(&env);
    let path = vec![&env, token_in.clone(), token_out.clone()];
    let deadline = env.ledger().timestamp() + 500;

    // Without email attestation, claim-and-swap must fail
    assert!(client
        .try_claim_and_swap_link(
            &link_hash, &secret, &recipient, &router, &path, &900i128, &deadline, &0i128, &None,
        )
        .is_err());

    // Record email attestation
    let mock_verifier = MockVerifierClient::new(&env, &verifier);
    mock_verifier.attest_email(&link_hash, &recipient, &intended_hash);

    // Now claim-and-swap must succeed
    let amounts = client.claim_and_swap_link(
        &link_hash, &secret, &recipient, &router, &path, &900i128, &deadline, &0i128, &None,
    );
    assert_eq!(amounts.get(1).unwrap(), 1000i128);

    let token_out_client = TokenClient::new(&env, &token_out);
    assert_eq!(token_out_client.balance(&recipient), 1000i128);
}
