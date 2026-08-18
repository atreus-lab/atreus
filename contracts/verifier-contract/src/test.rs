#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::testutils::Address as _;

fn setup(env: &Env) -> (VerifierContractClient<'_>, Address) {
    let attester = Address::generate(env);
    let contract_id = env.register(VerifierContract, (Bytes::new(env), attester.clone()));
    let client = VerifierContractClient::new(env, &contract_id);
    (client, attester)
}

#[test]
fn test_nullifier_unused_by_default() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let nullifier = BytesN::from_array(&env, &[1u8; 32]);

    assert!(!client.is_nullifier_used(&nullifier));
}

#[test]
fn test_mark_and_check_nullifier() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let nullifier = BytesN::from_array(&env, &[7u8; 32]);

    assert!(!client.is_nullifier_used(&nullifier));
    client.mark_nullifier(&attester, &nullifier);
    assert!(client.is_nullifier_used(&nullifier));
}

#[test]
fn test_different_nullifiers_are_independent() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let n1 = BytesN::from_array(&env, &[1u8; 32]);
    let n2 = BytesN::from_array(&env, &[2u8; 32]);

    client.mark_nullifier(&attester, &n1);
    assert!(client.is_nullifier_used(&n1));
    assert!(!client.is_nullifier_used(&n2));
}

#[test]
fn test_mark_nullifier_by_untrusted_attester_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let impostor = Address::generate(&env);
    let nullifier = BytesN::from_array(&env, &[9u8; 32]);

    assert!(client.try_mark_nullifier(&impostor, &nullifier).is_err());
    assert!(!client.is_nullifier_used(&nullifier));
}

#[test]
fn test_mark_nullifier_twice_is_idempotent() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let nullifier = BytesN::from_array(&env, &[3u8; 32]);

    client.mark_nullifier(&attester, &nullifier);
    client.mark_nullifier(&attester, &nullifier);
    assert!(client.is_nullifier_used(&nullifier));
}

// ---------------------------------------------------------------------------
// Attestation tests
// ---------------------------------------------------------------------------

#[test]
fn test_is_attested_returns_false_by_default() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let link_hash = BytesN::from_array(&env, &[10u8; 32]);
    let recipient = Address::generate(&env);

    assert!(!client.is_attested(&link_hash, &recipient));
}

#[test]
fn test_attest_by_trusted_attester() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let link_hash = BytesN::from_array(&env, &[20u8; 32]);
    let recipient = Address::generate(&env);

    client.attest(&attester, &link_hash, &recipient);
    assert!(client.is_attested(&link_hash, &recipient));
}

#[test]
fn test_attest_by_untrusted_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let impostor = Address::generate(&env);
    let link_hash = BytesN::from_array(&env, &[30u8; 32]);
    let recipient = Address::generate(&env);

    assert!(client
        .try_attest(&impostor, &link_hash, &recipient)
        .is_err());
    assert!(!client.is_attested(&link_hash, &recipient));
}

#[test]
fn test_attest_different_recipients_independent() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let link_hash = BytesN::from_array(&env, &[40u8; 32]);
    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);

    client.attest(&attester, &link_hash, &r1);
    assert!(client.is_attested(&link_hash, &r1));
    assert!(!client.is_attested(&link_hash, &r2));
}

#[test]
fn test_attest_different_link_hashes_independent() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let h1 = BytesN::from_array(&env, &[50u8; 32]);
    let h2 = BytesN::from_array(&env, &[51u8; 32]);
    let recipient = Address::generate(&env);

    client.attest(&attester, &h1, &recipient);
    assert!(client.is_attested(&h1, &recipient));
    assert!(!client.is_attested(&h2, &recipient));
}

// ---------------------------------------------------------------------------
// Email attestation tests
// ---------------------------------------------------------------------------

#[test]
fn test_is_email_attested_returns_false_by_default() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let link_hash = BytesN::from_array(&env, &[60u8; 32]);
    let recipient = Address::generate(&env);
    let email_hash = BytesN::from_array(&env, &[61u8; 32]);

    assert!(!client.is_email_attested(&link_hash, &recipient, &email_hash));
}

#[test]
fn test_attest_email_by_trusted() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let link_hash = BytesN::from_array(&env, &[70u8; 32]);
    let recipient = Address::generate(&env);
    let email_hash = BytesN::from_array(&env, &[71u8; 32]);

    client.attest_email(&attester, &link_hash, &recipient, &email_hash);
    assert!(client.is_email_attested(&link_hash, &recipient, &email_hash));
}

#[test]
fn test_attest_email_by_untrusted_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let impostor = Address::generate(&env);
    let link_hash = BytesN::from_array(&env, &[80u8; 32]);
    let recipient = Address::generate(&env);
    let email_hash = BytesN::from_array(&env, &[81u8; 32]);

    assert!(client
        .try_attest_email(&impostor, &link_hash, &recipient, &email_hash)
        .is_err());
    assert!(!client.is_email_attested(&link_hash, &recipient, &email_hash));
}

#[test]
fn test_email_attestation_binding() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let link_hash = BytesN::from_array(&env, &[90u8; 32]);
    let recipient = Address::generate(&env);
    let email_a = BytesN::from_array(&env, &[91u8; 32]);
    let email_b = BytesN::from_array(&env, &[92u8; 32]);

    client.attest_email(&attester, &link_hash, &recipient, &email_a);

    assert!(client.is_email_attested(&link_hash, &recipient, &email_a));
    assert!(!client.is_email_attested(&link_hash, &recipient, &email_b));
}

// ---------------------------------------------------------------------------
// Proof submission tests
// ---------------------------------------------------------------------------

#[test]
fn test_submit_proof_valid_length() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);
    let proof = soroban_sdk::Bytes::from_slice(&env, &std::vec![0u8; 2144]);

    let result = client.try_submit_proof(&recipient, &proof);
    assert!(result.is_ok());
}

#[test]
fn test_submit_proof_empty_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);
    let proof = soroban_sdk::Bytes::new(&env);

    assert!(client.try_submit_proof(&recipient, &proof).is_err());
}

#[test]
fn test_submit_proof_wrong_length_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);
    let proof = soroban_sdk::Bytes::from_slice(&env, &std::vec![0u8; 100]);

    assert!(client.try_submit_proof(&recipient, &proof).is_err());
}

#[test]
fn test_submit_proof_boundary_2143_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);
    let proof = soroban_sdk::Bytes::from_slice(&env, &std::vec![0u8; 2143]);

    assert!(client.try_submit_proof(&recipient, &proof).is_err());
}

#[test]
fn test_submit_proof_boundary_2145_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);
    let proof = soroban_sdk::Bytes::from_slice(&env, &std::vec![0u8; 2145]);

    assert!(client.try_submit_proof(&recipient, &proof).is_err());
}

// ---------------------------------------------------------------------------
// Verify proof placeholder tests
// ---------------------------------------------------------------------------

#[test]
fn test_verify_proof_empty_returns_false() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let public_inputs = soroban_sdk::Bytes::from_slice(&env, &std::vec![0u8; 100]);
    let proof = soroban_sdk::Bytes::new(&env);

    assert!(!client.verify_proof(&public_inputs, &proof));
}

#[test]
fn test_verify_proof_nonempty_returns_true() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let public_inputs = soroban_sdk::Bytes::from_slice(&env, &std::vec![0u8; 100]);
    let proof = soroban_sdk::Bytes::from_slice(&env, &std::vec![1u8; 2144]);

    assert!(client.verify_proof(&public_inputs, &proof));
}

// ---------------------------------------------------------------------------
// Verification key test
// ---------------------------------------------------------------------------

#[test]
fn test_verification_key_stored() {
    let env = Env::default();
    env.mock_all_auths();

    let attester = Address::generate(&env);
    let vk = soroban_sdk::Bytes::from_slice(&env, &std::vec![42u8; 64]);
    let contract_id = env.register(VerifierContract, (vk.clone(), attester));
    let client = VerifierContractClient::new(&env, &contract_id);

    assert_eq!(client.verification_key(), vk);
}
