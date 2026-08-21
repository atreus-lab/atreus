#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events},
    Symbol, TryFromVal,
};

fn setup(env: &Env) -> (VerifierContractClient<'_>, Address) {
    let attester = Address::generate(env);
    let contract_id = env.register(VerifierContract, (Bytes::new(env), attester.clone()));
    let client = VerifierContractClient::new(env, &contract_id);
    (client, attester)
}

/// Events the contract emitted during the most recent invocation, as (name, data).
/// The test host resets the buffer on every top-level call, so read it immediately
/// after the call under inspection.
fn events_of(env: &Env, contract: &Address) -> soroban_sdk::Vec<(Symbol, soroban_sdk::Val)> {
    let mut out = soroban_sdk::Vec::new(env);
    for (emitter, topics, data) in env.events().all().iter() {
        if &emitter != contract {
            continue;
        }
        assert_eq!(topics.len(), 1, "event must carry no topic beyond its name");
        let name = Symbol::try_from_val(env, &topics.get(0).unwrap()).unwrap();
        out.push_back((name, data));
    }
    out
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

    let events = events_of(&env, &client.address);
    assert_eq!(events.len(), 1);
    let (name, data) = events.get(0).unwrap();
    assert_eq!(name, symbol_short!("attested"));
    assert!(data.is_void(), "attested event must carry no key material");
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
    let events = events_of(&env, &client.address);
    assert_eq!(events.len(), 1);
    let (name, data) = events.get(0).unwrap();
    assert_eq!(name, symbol_short!("eml_att"));
    assert!(data.is_void());

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

#[test]
fn test_nullifier_event_carries_no_nullifier() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, attester) = setup(&env);
    let nullifier = BytesN::from_array(&env, &[7u8; 32]);
    client.mark_nullifier(&attester, &nullifier);

    let events = events_of(&env, &client.address);
    assert_eq!(events.len(), 1);
    let (name, data) = events.get(0).unwrap();
    assert_eq!(name, symbol_short!("nullifier"));
    assert!(data.is_void());
}
