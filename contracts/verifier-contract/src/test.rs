#![cfg(test)]

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
