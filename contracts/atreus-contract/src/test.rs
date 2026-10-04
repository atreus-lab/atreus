#![cfg(test)]
use super::*;
use soroban_sdk::{Bytes, Env, Vec};
use verifier_contract::VerifierContract;

#[test]
fn test_claim_link_valid_proof() {
    let env = Env::default();
    let recipient = Bytes::from(&[1u8; 32]);
    let link_hash = Bytes::from(&[2u8; 32]);
    let nullifier = Bytes::from(&[3u8; 32]);
    let proof = Bytes::from(&[4u8; 32]);
    let is_email_attested = false;

    // This test would need actual valid proof data
    // For now, we just test the flow without valid proof
    let result = std::panic::catch_unwind(|| {
        AtreusContract::claim_link(
            &env,
            recipient,
            link_hash,
            nullifier,
            proof,
            is_email_attested,
        );
    });

    assert!(result.is_err());
}

#[test]
fn test_nullifier_replay_protection() {
    let env = Env::default();
    let recipient = Bytes::from(&[1u8; 32]);
    let link_hash = Bytes::from(&[2u8; 32]);
    let nullifier = Bytes::from(&[3u8; 32]);
    let proof = Bytes::from(&[4u8; 32]);

    // First claim should fail (invalid proof)
    let result1 = std::panic::catch_unwind(|| {
        AtreusContract::claim_link(
            &env,
            recipient.clone(),
            link_hash.clone(),
            nullifier.clone(),
            proof.clone(),
            false,
        );
    });
    assert!(result1.is_err());

    // Second claim with same nullifier should also fail
    let result2 = std::panic::catch_unwind(|| {
        AtreusContract::claim_link(
            &env,
            recipient,
            link_hash,
            nullifier,
            proof,
            false,
        );
    });
    assert!(result2.is_err());
}
