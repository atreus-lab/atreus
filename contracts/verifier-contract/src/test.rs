#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, IntoVal, Symbol};

fn setup(env: &Env) -> (VerifierContractClient<'_>, Address) {
    let attester = Address::generate(env);
    let contract_id = env.register(VerifierContract, (Bytes::new(env), attester.clone()));
    let client = VerifierContractClient::new(env, &contract_id);
    (client, attester)
}

/// Assert exactly one event with the given name and void data was emitted
/// by `contract` during the most recent invocation.
fn assert_single_void_event(env: &Env, contract: &Address, expected_name: Symbol) {
    use soroban_sdk::testutils::Events as _;
    let events = env.events().all().filter_by_contract(contract);
    assert_eq!(
        events,
        vec![
            env,
            (
                contract.clone(),
                vec![env, expected_name].into_val(env),
                ().into_val(env),
            ),
        ]
    );
}

#[test]
fn test_attest_and_is_attested() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let claim_key = BytesN::from_array(&env, &[5u8; 32]);
    let other_key = BytesN::from_array(&env, &[6u8; 32]);

    assert!(!client.is_attested(&claim_key));
    client.attest(&attester, &claim_key);
    assert!(client.is_attested(&claim_key));
    assert!(!client.is_attested(&other_key));
}

#[test]
fn test_attest_by_untrusted_attester_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let impostor = Address::generate(&env);
    let claim_key = BytesN::from_array(&env, &[5u8; 32]);

    assert!(client.try_attest(&impostor, &claim_key).is_err());
    assert!(!client.is_attested(&claim_key));
}

#[test]
fn test_attested_event_carries_no_data() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let claim_key = BytesN::from_array(&env, &[5u8; 32]);
    client.attest(&attester, &claim_key);

    assert_single_void_event(&env, &client.address, symbol_short!("attested"));
}

#[test]
fn test_attest_email_and_is_email_attested() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let email_key = BytesN::from_array(&env, &[8u8; 32]);
    let other_key = BytesN::from_array(&env, &[9u8; 32]);

    assert!(!client.is_email_attested(&email_key));

    client.attest_email(&attester, &email_key);
    assert_single_void_event(&env, &client.address, symbol_short!("eml_att"));

    assert!(client.is_email_attested(&email_key));
    assert!(!client.is_email_attested(&other_key));
}

#[test]
fn test_attest_email_by_untrusted_attester_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let impostor = Address::generate(&env);
    let email_key = BytesN::from_array(&env, &[8u8; 32]);

    assert!(client.try_attest_email(&impostor, &email_key).is_err());
    assert!(!client.is_email_attested(&email_key));
}

#[test]
fn test_claim_and_email_keys_do_not_collide() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let key = BytesN::from_array(&env, &[4u8; 32]);

    client.attest(&attester, &key);
    assert!(client.is_attested(&key));
    assert!(!client.is_email_attested(&key));
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
// submit_proof byte-length check (see ULTRA_HONK_PROOF_LEN)
// ---------------------------------------------------------------------------

// Building a 14,656-byte Bytes with push_back would be one host call per byte;
// slice it out of a single static buffer instead.
const PROOF_BUF_LEN: usize = (ULTRA_HONK_PROOF_LEN + 1) as usize;
static ZERO_PROOF_BYTES: [u8; PROOF_BUF_LEN] = [0u8; PROOF_BUF_LEN];

fn proof_of_len(env: &Env, len: u32) -> Bytes {
    Bytes::from_slice(env, &ZERO_PROOF_BYTES[..len as usize])
}

#[test]
fn test_submit_proof_accepts_real_ultrahonk_proof_length() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);

    // 14,656 bytes = 458 BN254 field elements, the size this circuit actually
    // produces on the pinned toolchain.
    client.submit_proof(&recipient, &proof_of_len(&env, ULTRA_HONK_PROOF_LEN));
}

#[test]
fn test_submit_proof_rejects_legacy_ultraplonk_length() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);

    // 2144 bytes was the old hardcoded value (legacy UltraPlonk). Guarded
    // explicitly so the constant cannot silently regress to the stale size.
    assert!(client
        .try_submit_proof(&recipient, &proof_of_len(&env, 2144))
        .is_err());
}

#[test]
fn test_submit_proof_rejects_malformed_proofs() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let recipient = Address::generate(&env);

    assert!(client
        .try_submit_proof(&recipient, &Bytes::new(&env))
        .is_err());
    assert!(client
        .try_submit_proof(&recipient, &proof_of_len(&env, ULTRA_HONK_PROOF_LEN - 1))
        .is_err());
    assert!(client
        .try_submit_proof(&recipient, &proof_of_len(&env, ULTRA_HONK_PROOF_LEN + 1))
        .is_err());
}

// ---------------------------------------------------------------------------
// attest_batch
// ---------------------------------------------------------------------------
//
// Claims are supplied as blinded digests (issue #118), so these tests work in
// terms of claim_key / email_key rather than link_hash + recipient. The keys are
// opaque to the contract: it stores and looks them up verbatim, and claim_link
// recomputes the same digest from its own arguments plus the claim salt.

fn batch_claim(
    env: &Env,
    claim_key: u8,
    nullifier: u8,
    email_key: Option<BytesN<32>>,
) -> BatchClaim {
    BatchClaim {
        claim_key: BytesN::from_array(env, &[claim_key; 32]),
        nullifier: BytesN::from_array(env, &[nullifier; 32]),
        email_key,
    }
}

fn filler_claims(env: &Env, n: u32) -> Vec<BatchClaim> {
    let mut claims: Vec<BatchClaim> = Vec::new(env);
    for i in 0..n {
        let mut ck = [0u8; 32];
        let mut null = [0u8; 32];
        ck[0] = (i % 256) as u8;
        ck[1] = (i / 256) as u8;
        null[0] = (i % 256) as u8;
        null[1] = (i / 256) as u8;
        null[2] = 1;
        claims.push_back(BatchClaim {
            claim_key: BytesN::from_array(env, &ck),
            nullifier: BytesN::from_array(env, &null),
            email_key: None,
        });
    }
    claims
}

#[test]
fn test_attest_batch_records_every_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let c1 = batch_claim(&env, 1, 11, None);
    let c2 = batch_claim(&env, 2, 22, None);
    let c3 = batch_claim(&env, 3, 33, None);

    let claims = Vec::from_array(&env, [c1.clone(), c2.clone(), c3.clone()]);
    assert_eq!(client.attest_batch(&attester, &claims), 3);

    // Each claim attested and its nullifier burned - the same storage the
    // single-claim path writes, so claim_link sees no difference.
    assert!(client.is_attested(&c1.claim_key));
    assert!(client.is_attested(&c2.claim_key));
    assert!(client.is_attested(&c3.claim_key));
    assert!(client.is_nullifier_used(&c1.nullifier));
    assert!(client.is_nullifier_used(&c2.nullifier));
    assert!(client.is_nullifier_used(&c3.nullifier));
}

#[test]
fn test_attest_batch_matches_single_attest_storage() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let batched = batch_claim(&env, 7, 77, None);
    let single_key = BytesN::from_array(&env, &[8u8; 32]);

    client.attest_batch(&attester, &Vec::from_array(&env, [batched.clone()]));
    client.attest(&attester, &single_key);

    // A batched attestation is indistinguishable from a single one to any reader.
    assert!(client.is_attested(&batched.claim_key));
    assert!(client.is_attested(&single_key));

    let unattested = BytesN::from_array(&env, &[9u8; 32]);
    assert!(!client.is_attested(&unattested));
}

#[test]
fn test_attest_batch_records_email_binding_only_when_supplied() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let email_key = BytesN::from_array(&env, &[0xEEu8; 32]);
    let with_email = batch_claim(&env, 4, 44, Some(email_key.clone()));
    let without_email = batch_claim(&env, 5, 55, None);

    client.attest_batch(
        &attester,
        &Vec::from_array(&env, [with_email.clone(), without_email.clone()]),
    );

    assert!(client.is_email_attested(&email_key));
    // No email key supplied means no binding recorded. Batching must not become
    // a way to satisfy an email-restricted link without its binding.
    let other = BytesN::from_array(&env, &[0xDDu8; 32]);
    assert!(!client.is_email_attested(&other));
}

#[test]
fn test_attest_batch_rejects_duplicate_nullifier_within_batch() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    // Two different claims sharing one nullifier - a double-spend attempt
    // smuggled inside a single batch.
    let c1 = batch_claim(&env, 1, 99, None);
    let c2 = batch_claim(&env, 2, 99, None);

    assert!(client
        .try_attest_batch(&attester, &Vec::from_array(&env, [c1.clone(), c2.clone()]))
        .is_err());

    // Atomic: the first claim must not survive either.
    assert!(!client.is_nullifier_used(&c1.nullifier));
    assert!(!client.is_attested(&c1.claim_key));
}

#[test]
fn test_attest_batch_rejects_already_used_nullifier() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let c = batch_claim(&env, 6, 66, None);

    client.mark_nullifier(&attester, &c.nullifier);

    assert!(client
        .try_attest_batch(&attester, &Vec::from_array(&env, [c.clone()]))
        .is_err());
    assert!(!client.is_attested(&c.claim_key));
}

#[test]
fn test_attest_batch_is_atomic_on_later_failure() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let good1 = batch_claim(&env, 1, 10, None);
    let good2 = batch_claim(&env, 2, 20, None);
    let bad = batch_claim(&env, 3, 30, None);

    // Burn the third nullifier so the batch fails partway through.
    client.mark_nullifier(&attester, &bad.nullifier);

    assert!(client
        .try_attest_batch(
            &attester,
            &Vec::from_array(&env, [good1.clone(), good2.clone(), bad.clone()])
        )
        .is_err());

    // Nothing survives - not even claims processed before the failure.
    assert!(!client.is_attested(&good1.claim_key));
    assert!(!client.is_attested(&good2.claim_key));
    assert!(!client.is_nullifier_used(&good1.nullifier));
    assert!(!client.is_nullifier_used(&good2.nullifier));
}

#[test]
fn test_attest_batch_rejects_untrusted_attester() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _attester) = setup(&env);
    let impostor = Address::generate(&env);
    let c = batch_claim(&env, 8, 88, None);

    assert!(client
        .try_attest_batch(&impostor, &Vec::from_array(&env, [c.clone()]))
        .is_err());
    assert!(!client.is_attested(&c.claim_key));
    assert!(!client.is_nullifier_used(&c.nullifier));
}

#[test]
fn test_attest_batch_rejects_empty_batch() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let empty: Vec<BatchClaim> = Vec::new(&env);

    assert!(client.try_attest_batch(&attester, &empty).is_err());
}

#[test]
fn test_attest_batch_rejects_oversized_batch() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let claims = filler_claims(&env, MAX_BATCH_CLAIMS + 1);

    assert!(client.try_attest_batch(&attester, &claims).is_err());
}

#[test]
fn test_attest_batch_at_max_size_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let claims = filler_claims(&env, MAX_BATCH_CLAIMS);

    assert_eq!(client.attest_batch(&attester, &claims), MAX_BATCH_CLAIMS);
}
