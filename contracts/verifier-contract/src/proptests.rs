#![cfg(test)]

extern crate std;

use super::*;
use proptest::prelude::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Bytes, BytesN, Env};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn setup_env() -> (Env, VerifierContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let attester = Address::generate(&env);
    let contract_id = env.register(VerifierContract, (Bytes::new(&env), attester.clone()));
    let client = VerifierContractClient::new(&env, &contract_id);
    (env, client, attester)
}

fn arb_32bytes() -> impl Strategy<Value = [u8; 32]> {
    any::<[u8; 32]>()
}

// ---------------------------------------------------------------------------
// Property: Attestation idempotency
//
// Attesting the same (link_hash, recipient) pair twice should not cause
// errors, and is_attested should still return true.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_attestation_idempotent(
        link_bytes in arb_32bytes(),
        _recipient_bytes in arb_32bytes(),
    ) {
        let (env, client, attester) = setup_env();
        let link_hash = BytesN::from_array(&env, &link_bytes);
        let recipient = Address::generate(&env);

        // Initially not attested
        prop_assert!(!client.is_attested(&link_hash, &recipient));

        // First attestation
        client.attest(&attester, &link_hash, &recipient);
        prop_assert!(client.is_attested(&link_hash, &recipient));

        // Second attestation (idempotent)
        client.attest(&attester, &link_hash, &recipient);
        prop_assert!(client.is_attested(&link_hash, &recipient));
    }
}

// ---------------------------------------------------------------------------
// Property: Email attestation binding
//
// is_email_attested should only return true for the exact
// (link_hash, recipient, email_hash) triple that was attested.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_email_attestation_binding(
        link_bytes in arb_32bytes(),
        email_hash_bytes in arb_32bytes(),
    ) {
        let (env, client, attester) = setup_env();
        let link_hash = BytesN::from_array(&env, &link_bytes);
        let recipient = Address::generate(&env);
        let email_hash = BytesN::from_array(&env, &email_hash_bytes);

        // Initially not attested
        prop_assert!(!client.is_email_attested(&link_hash, &recipient, &email_hash));

        // Attest
        client.attest_email(&attester, &link_hash, &recipient, &email_hash);
        prop_assert!(client.is_email_attested(&link_hash, &recipient, &email_hash));

        // Different email hash should not be attested
        let mut other_hash_bytes = email_hash_bytes;
        other_hash_bytes[0] = other_hash_bytes[0].wrapping_add(1);
        if other_hash_bytes == email_hash_bytes {
            other_hash_bytes[31] = other_hash_bytes[31].wrapping_add(1);
        }
        let other_hash = BytesN::from_array(&env, &other_hash_bytes);
        prop_assert!(!client.is_email_attested(&link_hash, &recipient, &other_hash));
    }
}

// ---------------------------------------------------------------------------
// Property: Nullifier independence
//
// Marking nullifier A must not affect nullifier B.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_nullifier_independence(
        null_a in arb_32bytes(),
        null_b in arb_32bytes(),
    ) {
        prop_assume!(null_a != null_b);

        let (env, client, attester) = setup_env();
        let n_a = BytesN::from_array(&env, &null_a);
        let n_b = BytesN::from_array(&env, &null_b);

        prop_assert!(!client.is_nullifier_used(&n_a));
        prop_assert!(!client.is_nullifier_used(&n_b));

        client.mark_nullifier(&attester, &n_a);

        prop_assert!(client.is_nullifier_used(&n_a));
        prop_assert!(!client.is_nullifier_used(&n_b));
    }
}

// ---------------------------------------------------------------------------
// Property: Untrusted attester rejection
//
// Operations by non-deployed attesters must always fail.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_untrusted_attester_rejection(
        link_bytes in arb_32bytes(),
        null_bytes in arb_32bytes(),
    ) {
        let (env, client, _attester) = setup_env();
        let impostor = Address::generate(&env);
        let link_hash = BytesN::from_array(&env, &link_bytes);
        let recipient = Address::generate(&env);
        let email_hash = BytesN::from_array(&env, &[0u8; 32]);
        let nullifier = BytesN::from_array(&env, &null_bytes);

        // All operations by impostor must fail
        prop_assert!(client.try_attest(&impostor, &link_hash, &recipient).is_err());
        prop_assert!(client.try_attest_email(&impostor, &link_hash, &recipient, &email_hash).is_err());
        prop_assert!(client.try_mark_nullifier(&impostor, &nullifier).is_err());

        // Nothing should be stored
        prop_assert!(!client.is_attested(&link_hash, &recipient));
        prop_assert!(!client.is_email_attested(&link_hash, &recipient, &email_hash));
        prop_assert!(!client.is_nullifier_used(&nullifier));
    }
}

// ---------------------------------------------------------------------------
// Property: Nullifier mark idempotency
//
// Marking the same nullifier twice should not error and should leave it
// in the "used" state.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_nullifier_mark_idempotent(
        null_bytes in arb_32bytes(),
    ) {
        let (env, client, attester) = setup_env();
        let nullifier = BytesN::from_array(&env, &null_bytes);

        client.mark_nullifier(&attester, &nullifier);
        prop_assert!(client.is_nullifier_used(&nullifier));

        // Mark again
        client.mark_nullifier(&attester, &nullifier);
        prop_assert!(client.is_nullifier_used(&nullifier));
    }
}

// ---------------------------------------------------------------------------
// Property: Proof submission length validation
//
// submit_proof should only accept exactly 2144-byte proofs.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_proof_length_validation(
        proof_len in 0usize..=5000,
    ) {
        let (env, client, _attester) = setup_env();
        let recipient = Address::generate(&env);

        // Build a proof of the exact requested length
        let proof_data: std::vec::Vec<u8> = std::vec![0u8; proof_len];
        let proof = soroban_sdk::Bytes::from_slice(&env, &proof_data);

        let result = client.try_submit_proof(&recipient, &proof);

        if proof_len == 2144 {
            prop_assert!(result.is_ok(), "2144-byte proof should be accepted");
        } else {
            prop_assert!(result.is_err(), "proof of length {} should be rejected", proof_len);
        }
    }
}

// ---------------------------------------------------------------------------
// Property: Verification key persistence
//
// verification_key() should always return the value set at construction.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_verification_key_persisted(
        vk_bytes in prop::collection::vec(any::<u8>(), 0..=256),
    ) {
        let env = Env::default();
        env.mock_all_auths();
        let attester = Address::generate(&env);
        let vk = soroban_sdk::Bytes::from_slice(&env, &vk_bytes);
        let contract_id = env.register(VerifierContract, (vk.clone(), attester));
        let client = VerifierContractClient::new(&env, &contract_id);

        prop_assert_eq!(client.verification_key(), vk);
    }
}
