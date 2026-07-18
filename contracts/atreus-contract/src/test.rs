#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, testutils::Ledger,
    token::StellarAssetClient, Address, Bytes, BytesN, Env, Symbol,
};

// Minimal mock verifier that always returns true for is_attested and is_email_attested.
// In production, VerifierContract::attest() is only callable by the trusted attester
// after it has verified a real Pedersen-based UltraHonk proof off-chain.
#[contract]
pub struct MockVerifier;

#[contractimpl]
impl MockVerifier {
    pub fn __constructor(env: Env, _vk: Bytes, _attester: Address) {
        env.storage().instance().set(&Symbol::new(&env, "init"), &true);
    }

    pub fn is_attested(_env: Env, _link_id: BytesN<32>, _recipient: Address) -> bool {
        true
    }

    pub fn is_email_attested(_env: Env, _link_id: BytesN<32>, _recipient: Address, _email_hash: BytesN<32>) -> bool {
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

/// Derive the on-chain link_id from a secret value.
///
/// `link_id = sha256(secret_bytes)` — this is the storage key stored in the contract
/// when `create_link` is called, and what is embedded in the shareable URL.
///
/// Note: the ZK circuit uses a *separate* `link_hash = pedersen_hash(secret_as_field)`
/// as a public input — that computation happens off-chain in the browser and backend
/// and is never sent to the contract. The contract only ever sees the SHA-256 link_id.
fn make_link_id(env: &Env, val: u8) -> BytesN<32> {
    let secret = BytesN::from_array(env, &[val; 32]);
    let secret_bytes = Bytes::from_array(env, &secret.to_array());
    let hash = env.crypto().sha256(&secret_bytes);
    BytesN::from_array(env, &hash.to_array())
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
    let link_id = make_link_id(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let intended_email = "alice@example.com";
    let intended_hash = email_hash(&env, intended_email);
    let policy_params = Bytes::from_array(&env, &intended_hash.to_array());

    // Create link with email restriction (policy_type=1)
    client.create_link(&link_id, &1u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);

    // Claim — mock verifier always returns true for is_attested and is_email_attested,
    // simulating a successful Pedersen-based ZK proof verified off-chain by the attester.
    client.claim_link(&link_id, &recipient, &intended_hash);
}

#[test]
fn test_create_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let link_id = make_link_id(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    // The mock verifier approves the ZK attestation. In production the attester
    // verifies the UltraHonk proof (Pedersen-based) before recording an attestation.
    client.claim_link(&link_id, &recipient, &empty_email_hash(&env));
}

#[test]
fn test_double_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let link_id = make_link_id(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    client.claim_link(&link_id, &recipient, &empty_email_hash(&env));

    assert!(client.try_claim_link(&link_id, &recipient, &empty_email_hash(&env)).is_err());
}

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let link_id = make_link_id(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    env.ledger().set_timestamp(expiry + 1);
    client.refund_link(&link_id);
}

#[test]
fn test_claim_expired_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let link_id = make_link_id(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    env.ledger().set_timestamp(expiry + 1);

    let recipient = Address::generate(&env);
    assert!(client.try_claim_link(&link_id, &recipient, &empty_email_hash(&env)).is_err());
}

#[test]
fn test_duplicate_link_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);
    let link_id = make_link_id(&env, 1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let policy_params = Bytes::new(&env);

    // First create should succeed
    client.create_link(&link_id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    // Second create with same ID should fail
    assert!(client.try_create_link(&link_id, &0u32, &policy_params, &amount, &token, &expiry, &sender).is_err());
}

/// Verify that creating a link with a known SHA-256 link_id works correctly.
/// This test documents the dual-hash architecture:
///
/// - **SHA-256** (`link_id`): Used on-chain as the storage key. Computed from the raw
///   secret bytes. Embedded in the shareable URL fragment.
/// - **Pedersen** (off-chain): Used inside the ZK circuit as the `link_hash` public
///   input. Proves knowledge of the secret without revealing it. Never stored on-chain.
#[test]
fn test_link_id_is_sha256_of_secret() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, sender, token) = setup_test(&env);

    // secret = [0x42; 32] → link_id = sha256([0x42; 32])
    let secret_bytes_arr = [0x42u8; 32];
    let secret_bytes = Bytes::from_array(&env, &secret_bytes_arr);
    let link_id = BytesN::from_array(&env, &env.crypto().sha256(&secret_bytes).to_array());

    let amount = 500i128;
    let expiry = env.ledger().timestamp() + 3600;
    let policy_params = Bytes::new(&env);

    client.create_link(&link_id, &0u32, &policy_params, &amount, &token, &expiry, &sender);

    let recipient = Address::generate(&env);
    client.claim_link(&link_id, &recipient, &empty_email_hash(&env));
}
