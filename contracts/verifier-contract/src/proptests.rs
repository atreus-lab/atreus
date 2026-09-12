#![cfg(test)]

extern crate std;

use super::*;
use proptest::prelude::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Bytes, BytesN, Env, Vec};

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
// Attesting the same claim_key twice should not cause errors,
// and is_attested should still return true.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_attestation_idempotent(
        claim_bytes in arb_32bytes(),
    ) {
        let (env, client, attester) = setup_env();
        let claim_key = BytesN::from_array(&env, &claim_bytes);

        // Initially not attested
        prop_assert!(!client.is_attested(&claim_key));

        // First attestation
        client.attest(&attester, &claim_key);
        prop_assert!(client.is_attested(&claim_key));

        // Second attestation (idempotent)
        client.attest(&attester, &claim_key);
        prop_assert!(client.is_attested(&claim_key));
    }
}

// ---------------------------------------------------------------------------
// Property: Email attestation binding
//
// is_email_attested should only return true for the exact email_key
// that was attested.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_email_attestation_binding(
        email_bytes in arb_32bytes(),
    ) {
        let (env, client, attester) = setup_env();
        let email_key = BytesN::from_array(&env, &email_bytes);

        // Initially not attested
        prop_assert!(!client.is_email_attested(&email_key));

        // Attest
        client.attest_email(&attester, &email_key);
        prop_assert!(client.is_email_attested(&email_key));

        // Different email key should not be attested
        let mut other_bytes = email_bytes;
        other_bytes[0] = other_bytes[0].wrapping_add(1);
        if other_bytes == email_bytes {
            other_bytes[31] = other_bytes[31].wrapping_add(1);
        }
        let other_key = BytesN::from_array(&env, &other_bytes);
        prop_assert!(!client.is_email_attested(&other_key));
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
        claim_bytes in arb_32bytes(),
        null_bytes in arb_32bytes(),
    ) {
        let (env, client, _attester) = setup_env();
        let impostor = Address::generate(&env);
        let claim_key = BytesN::from_array(&env, &claim_bytes);
        let email_key = BytesN::from_array(&env, &claim_bytes);
        let nullifier = BytesN::from_array(&env, &null_bytes);

        // All operations by impostor must fail
        prop_assert!(client.try_attest(&impostor, &claim_key).is_err());
        prop_assert!(client.try_attest_email(&impostor, &email_key).is_err());
        prop_assert!(client.try_mark_nullifier(&impostor, &nullifier).is_err());

        // Nothing should be stored
        prop_assert!(!client.is_attested(&claim_key));
        prop_assert!(!client.is_email_attested(&email_key));
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
// submit_proof should only accept exactly ULTRA_HONK_PROOF_LEN bytes.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_proof_length_validation(
        proof_len in 0usize..=20000,
    ) {
        let (env, client, _attester) = setup_env();
        let recipient = Address::generate(&env);

        let proof_data: std::vec::Vec<u8> = std::vec![0u8; proof_len];
        let proof = soroban_sdk::Bytes::from_slice(&env, &proof_data);

        let result = client.try_submit_proof(&recipient, &proof);

        if proof_len == ULTRA_HONK_PROOF_LEN as usize {
            prop_assert!(result.is_ok(), "{}-byte proof should be accepted", proof_len);
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

// ---------------------------------------------------------------------------
// Property: Batch attestation — atomicity
//
// If any claim in a batch has a duplicate nullifier, the entire batch
// must be rolled back — none of the claims should be attested.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_batch_atomicity(
        valid_count in 1u32..=5,
        dup_idx in 0usize..5,
    ) {
        let (env, client, attester) = setup_env();

        let mut claims: Vec<BatchClaim> = Vec::new(&env);
        let mut used_nulls: std::vec::Vec<[u8; 32]> = std::vec::Vec::new();

        for i in 0..=valid_count {
            let ck = BytesN::from_array(&env, &[i as u8; 32]);
            let null_bytes = [(i + 10) as u8; 32];
            let null = BytesN::from_array(&env, &null_bytes);

            if i < valid_count {
                used_nulls.push(null_bytes);
            } else {
                // Insert a duplicate nullifier
                let dup_pos = dup_idx % used_nulls.len();
                let null = BytesN::from_array(&env, &used_nulls[dup_pos]);
                claims.push_back(BatchClaim {
                    claim_key: ck,
                    nullifier: null,
                    email_key: None,
                });
                continue;
            }

            claims.push_back(BatchClaim {
                claim_key: ck,
                nullifier: null,
                email_key: None,
            });
        }

        let result = client.try_attest_batch(&attester, &claims);
        prop_assert!(result.is_err(), "batch with duplicate nullifier must fail");

        // Atomic: none of the claims should have been written
        for claim in claims.iter() {
            prop_assert!(!client.is_attested(&claim.claim_key),
                "claim_key attested despite batch failure");
            prop_assert!(!client.is_nullifier_used(&claim.nullifier),
                "nullifier marked despite batch failure");
        }
    }
}

// ---------------------------------------------------------------------------
// Property: Batch attestation — independence from single attest
//
// A claim attested via batch should be indistinguishable from one attested
// via the single-claim path.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_batch_matches_single_attest(
        claim_bytes in arb_32bytes(),
        null_bytes in arb_32bytes(),
    ) {
        let (env, client, attester) = setup_env();

        let claim_key = BytesN::from_array(&env, &claim_bytes);
        let nullifier = BytesN::from_array(&env, &null_bytes);

        // Attest via batch
        let batch_claim = BatchClaim {
            claim_key: claim_key.clone(),
            nullifier: nullifier.clone(),
            email_key: None,
        };
        let claims = Vec::from_array(&env, [batch_claim]);
        client.attest_batch(&attester, &claims);

        // Verify via single-claim readers
        assert!(client.is_attested(&claim_key));
        assert!(client.is_nullifier_used(&nullifier));
    }
}

// ---------------------------------------------------------------------------
// Property: Batch attestation — email binding only when supplied
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_batch_email_binding_selective(
        email_bytes in arb_32bytes(),
    ) {
        let (env, client, attester) = setup_env();

        let email_key = BytesN::from_array(&env, &email_bytes);
        let ck_with = BytesN::from_array(&env, &[1u8; 32]);
        let null_with = BytesN::from_array(&env, &[10u8; 32]);
        let ck_without = BytesN::from_array(&env, &[2u8; 32]);
        let null_without = BytesN::from_array(&env, &[20u8; 32]);

        let with_email = BatchClaim {
            claim_key: ck_with.clone(),
            nullifier: null_with,
            email_key: Some(email_key.clone()),
        };
        let without_email = BatchClaim {
            claim_key: ck_without.clone(),
            nullifier: null_without,
            email_key: None,
        };

        client.attest_batch(&attester, &Vec::from_array(&env, [with_email, without_email]));

        // Email key recorded
        assert!(client.is_email_attested(&email_key));

        // No email binding means no spurious attestation for a different key
        let other = BytesN::from_array(&env, &[0xDDu8; 32]);
        assert!(!client.is_email_attested(&other));
    }
}
