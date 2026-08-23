#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl, contracttype,
    testutils::{Address as _, Events, Ledger, MockAuth, MockAuthInvoke},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Bytes, BytesN, Env, IntoVal, Symbol, TryFromVal,
};

#[contracttype]
#[derive(Clone)]
pub enum MockDataKey {
    Attestation(BytesN<32>),
    EmailAttestation(BytesN<32>),
}

// Minimal mock verifier: mirrors the real verifier-contract's blinded-key
// attestation registry so claims only succeed once the trusted attester has
// recorded an attestation under the exact key `claim_link` recomputes.
#[contract]
pub struct MockVerifier;

#[contractimpl]
impl MockVerifier {
    pub fn __constructor(env: Env, _vk: Bytes, _attester: Address) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "init"), &true);
    }

    pub fn attest(env: Env, claim_key: BytesN<32>) {
        env.storage()
            .persistent()
            .set(&MockDataKey::Attestation(claim_key), &true);
    }

    pub fn is_attested(env: Env, claim_key: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&MockDataKey::Attestation(claim_key))
            .unwrap_or(false)
    }

    pub fn attest_email(env: Env, email_key: BytesN<32>) {
        env.storage()
            .persistent()
            .set(&MockDataKey::EmailAttestation(email_key), &true);
    }

    pub fn is_email_attested(env: Env, email_key: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&MockDataKey::EmailAttestation(email_key))
            .unwrap_or(false)
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

// The link hash is still sha256(secret), but the secret never reaches the chain.
fn make_link_hash(env: &Env, val: u8) -> BytesN<32> {
    let secret = Bytes::from_array(env, &[val; 32]);
    BytesN::from_array(env, &env.crypto().sha256(&secret).to_array())
}

fn make_salt(env: &Env, val: u8) -> BytesN<32> {
    BytesN::from_array(env, &[val; 32])
}

fn no_relayer(env: &Env) -> (Address, i128) {
    (Address::generate(env), 0)
}

fn email_hash(env: &Env, email: &str) -> BytesN<32> {
    let email_bytes = Bytes::from_slice(env, email.as_bytes());
    let hash = env.crypto().sha256(&email_bytes);
    BytesN::from_array(env, &hash.to_array())
}

// Spec v1: claim_key = sha256("ATREUS_CLAIM_V1" || link_hash || recipient strkey || salt).
// Spelled out here so the test checks the contract rather than reusing its code.
fn expected_claim_key(
    env: &Env,
    link_hash: &BytesN<32>,
    recipient: &Address,
    salt: &BytesN<32>,
) -> BytesN<32> {
    let mut preimage = Bytes::from_slice(env, b"ATREUS_CLAIM_V1");
    preimage.extend_from_array(&link_hash.to_array());
    preimage.append(&Bytes::from_slice(env, &strkey_ascii(recipient)));
    preimage.extend_from_array(&salt.to_array());
    BytesN::from_array(env, &env.crypto().sha256(&preimage).to_array())
}

// Spec v1: email_key = sha256("ATREUS_EMAIL_V1" || link_hash || recipient strkey
// || email_hash || salt).
fn expected_email_key(
    env: &Env,
    link_hash: &BytesN<32>,
    recipient: &Address,
    email: &BytesN<32>,
    salt: &BytesN<32>,
) -> BytesN<32> {
    let mut preimage = Bytes::from_slice(env, b"ATREUS_EMAIL_V1");
    preimage.extend_from_array(&link_hash.to_array());
    preimage.append(&Bytes::from_slice(env, &strkey_ascii(recipient)));
    preimage.extend_from_array(&email.to_array());
    preimage.extend_from_array(&salt.to_array());
    BytesN::from_array(env, &env.crypto().sha256(&preimage).to_array())
}

fn strkey_ascii(address: &Address) -> [u8; 56] {
    let s = address.to_string();
    assert_eq!(s.len(), 56);
    let mut out = [0u8; 56];
    s.copy_into_slice(&mut out);
    out
}

fn attest_claim(
    env: &Env,
    verifier: &Address,
    link_hash: &BytesN<32>,
    recipient: &Address,
    salt: &BytesN<32>,
) {
    MockVerifierClient::new(env, verifier)
        .attest(&expected_claim_key(env, link_hash, recipient, salt));
}

// Frozen interface spec v1 vectors, shared with the backend and the frontend. They
// pin the sha256 concatenation layout, so a change on any side breaks here first.
#[test]
fn test_blinded_keys_match_frozen_spec_vectors() {
    let env = Env::default();

    let link_hash = BytesN::from_array(&env, &[0x11u8; 32]);
    let salt = BytesN::from_array(&env, &[0x22u8; 32]);
    let email_hash = [0x33u8; 32];
    let mut strkey = [b'A'; 56];
    strkey[0] = b'G';

    let claim_key = blinded_key(&env, CLAIM_DOMAIN, &link_hash, &strkey, None, &salt);
    assert_eq!(
        claim_key,
        BytesN::from_array(
            &env,
            &[
                0xd3, 0xb2, 0x54, 0xd7, 0x68, 0x98, 0xad, 0x1a, 0x48, 0x72, 0x44, 0xdc, 0x41, 0x09,
                0x6f, 0x6c, 0x2b, 0xa2, 0xfe, 0x62, 0x8b, 0x41, 0xab, 0x77, 0x16, 0x32, 0x07, 0xaf,
                0x1d, 0x1e, 0xb2, 0xcf,
            ]
        )
    );

    let email_key = blinded_key(
        &env,
        EMAIL_DOMAIN,
        &link_hash,
        &strkey,
        Some(&email_hash),
        &salt,
    );
    assert_eq!(
        email_key,
        BytesN::from_array(
            &env,
            &[
                0x40, 0x05, 0x37, 0xee, 0xdb, 0x18, 0x3b, 0x6c, 0xbf, 0x1a, 0xe7, 0xc5, 0x08, 0x94,
                0x18, 0xc7, 0xf8, 0x0a, 0x37, 0xc4, 0x3c, 0x02, 0x0b, 0x2a, 0xf7, 0x46, 0x14, 0xb9,
                0x34, 0x8c, 0x8b, 0xf9,
            ]
        )
    );
}

#[test]
fn test_email_restricted_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0xA1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let intended_hash = email_hash(&env, "alice@example.com");
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

    // No email attestation recorded yet — claiming must fail
    assert!(client
        .try_claim_link(&link_hash, &recipient, &salt, &relayer, &fee)
        .is_err());

    // Trusted attester records the blinded email key for the intended address
    let mock_verifier = MockVerifierClient::new(&env, &verifier);
    mock_verifier.attest_email(&expected_email_key(
        &env,
        &link_hash,
        &recipient,
        &intended_hash,
        &salt,
    ));

    client.claim_link(&link_hash, &recipient, &salt, &relayer, &fee);
}

#[test]
#[should_panic(expected = "email not attested for this recipient")]
fn test_email_restricted_claim_rejects_wrong_email() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0xA1);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;
    let intended_hash = email_hash(&env, "alice@example.com");
    let policy_params = Bytes::from_array(&env, &intended_hash.to_array());

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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

    // Attester vouched for a different address than the link restricts to
    let wrong_hash = email_hash(&env, "bob@example.com");
    MockVerifierClient::new(&env, &verifier).attest_email(&expected_email_key(
        &env,
        &link_hash,
        &recipient,
        &wrong_hash,
        &salt,
    ));

    client.claim_link(&link_hash, &recipient, &salt, &relayer, &fee);
}

#[test]
fn test_create_and_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0x11);
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);
    client.claim_link(&link_hash, &recipient, &salt, &relayer, &fee);

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), amount);
}

#[test]
fn test_claimed_event_carries_no_link_or_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0x5A);
    let amount = 1000i128;
    let expiry = env.ledger().timestamp() + 1000;

    client.create_link(
        &link_hash,
        &0u32,
        &Bytes::new(&env),
        &amount,
        &token,
        &expiry,
        &sender,
    );

    let recipient = Address::generate(&env);
    let relayer = Address::generate(&env);
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

    // The test host resets the event buffer per top-level call, so read it here.
    client.claim_link(&link_hash, &recipient, &salt, &relayer, &50i128);

    let mut seen = 0u32;
    for (emitter, topics, data) in env.events().all().iter() {
        if emitter != client.address {
            continue;
        }
        seen += 1;
        assert_eq!(topics.len(), 1, "claimed event must carry only its name");
        let name = Symbol::try_from_val(&env, &topics.get(0).unwrap()).unwrap();
        assert_eq!(name, symbol_short!("claimed"));
        assert!(data.is_void(), "claimed event must carry no data");
    }
    assert_eq!(seen, 1, "exactly one claimed event expected");
}

#[test]
fn test_claim_pays_fee_bound_relayer_and_remainder_to_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 2);
    let salt = make_salt(&env, 0x22);
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

    client
        .mock_auths(&[MockAuth {
            address: &recipient,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "claim_link",
                args: (
                    link_hash.clone(),
                    recipient.clone(),
                    salt.clone(),
                    relayer.clone(),
                    relayer_fee,
                )
                    .into_val(&env),
                sub_invokes: &[],
            },
        }])
        .claim_link(&link_hash, &recipient, &salt, &relayer, &relayer_fee);

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), amount - relayer_fee);
    assert_eq!(token_client.balance(&relayer), relayer_fee);
}

#[test]
fn test_claim_rejects_tampered_fee_not_covered_by_user_authorization() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 4);
    let salt = make_salt(&env, 0x44);
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

    assert!(client
        .mock_auths(&[MockAuth {
            address: &recipient,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "claim_link",
                args: (
                    link_hash.clone(),
                    recipient.clone(),
                    salt.clone(),
                    relayer.clone(),
                    signed_fee,
                )
                    .into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_claim_link(&link_hash, &recipient, &salt, &relayer, &tampered_fee)
        .is_err());

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), 0);
    assert_eq!(token_client.balance(&relayer), 0);
}

#[test]
fn test_claim_rejects_fee_greater_than_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 3);
    let salt = make_salt(&env, 0x33);
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);
    assert!(client
        .try_claim_link(&link_hash, &recipient, &salt, &relayer, &(amount + 1))
        .is_err());
}

#[test]
#[should_panic(expected = "no valid ZK attestation for this claim")]
fn test_wrong_salt_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0x11);
    let wrong_salt = make_salt(&env, 0x99);
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

    client.claim_link(&link_hash, &recipient, &wrong_salt, &relayer, &fee);
}

#[test]
fn test_unattested_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0x11);
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
        .try_claim_link(&link_hash, &recipient, &salt, &relayer, &fee)
        .is_err());
}

#[test]
#[should_panic(expected = "already claimed")]
fn test_double_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0x11);
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);
    client.claim_link(&link_hash, &recipient, &salt, &relayer, &fee);

    client.claim_link(&link_hash, &recipient, &salt, &relayer, &fee);
}

#[test]
fn test_refund_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
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

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&sender), 10000i128);
}

#[test]
fn test_claim_expired_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
    let salt = make_salt(&env, 0x11);
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
    attest_claim(&env, &verifier, &link_hash, &recipient, &salt);
    assert!(client
        .try_claim_link(&link_hash, &recipient, &salt, &relayer, &fee)
        .is_err());
}

#[test]
fn test_duplicate_link_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let link_hash = make_link_hash(&env, 1);
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

// ---------------------------------------------------------------------
// Split links: partial claims (#120) and multiple recipients (#120).
//
// A single-recipient split link is the "partial claims" mode (one payee
// drawing the escrowed amount down over several `claim_split` calls); a
// multi-recipient split link is the "split recipients" mode (a fixed payee
// list, each with a defined share). Both share the state machine tested
// below. See docs/architecture.md §5.1 for the full design.
// ---------------------------------------------------------------------

#[test]
fn test_split_multiple_recipients_each_claim_full_share() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 1);
    let expiry = env.ledger().timestamp() + 1000;

    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);
    let r3 = Address::generate(&env);
    let recipients = vec![&env, r1.clone(), r2.clone(), r3.clone()];
    let shares = vec![&env, 500i128, 300i128, 200i128];

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &recipients,
        &shares,
        &0u32,
    );

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&client.address), 1000i128);

    // No ZK attestation needed: recipients are named Addresses at creation,
    // so `recipient.require_auth()` alone gates each claim.
    let salt = make_salt(&env, 0);
    for (recipient, share) in [(&r1, 500i128), (&r2, 300i128), (&r3, 200i128)] {
        let (relayer, fee) = no_relayer(&env);
        client.claim_split(&id, recipient, &share, &salt, &relayer, &fee);
        assert_eq!(token_client.balance(recipient), share);
    }

    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_split_partial_claims_accumulate_to_full_allocation() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 2);
    let expiry = env.ledger().timestamp() + 1000;
    let recipient = Address::generate(&env);

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &vec![&env, recipient.clone()],
        &vec![&env, 1000i128],
        &1000u32, // 10% minimum per non-final partial claim
    );

    let (relayer, fee) = no_relayer(&env);
    let salt = make_salt(&env, 0);

    // First partial claim: 400 (>= 10% of 1000).
    client.claim_split(&id, &recipient, &400i128, &salt, &relayer, &fee);

    // Second claim closes out the exact remainder (600), which is always
    // allowed regardless of the minimum floor.
    client.claim_split(&id, &recipient, &600i128, &salt, &relayer, &fee);

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), 1000i128);
    assert_eq!(token_client.balance(&client.address), 0);

    // Nothing left to claim.
    assert!(client
        .try_claim_split(&id, &recipient, &1i128, &salt, &relayer, &fee)
        .is_err());
}

#[test]
fn test_split_partial_claim_below_minimum_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 3);
    let expiry = env.ledger().timestamp() + 1000;
    let recipient = Address::generate(&env);

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &vec![&env, recipient.clone()],
        &vec![&env, 1000i128],
        &5000u32, // 50% minimum per non-final partial claim
    );

    let salt = make_salt(&env, 0);
    let (relayer, fee) = no_relayer(&env);

    // 100 is below the 50% floor and doesn't close out the remainder.
    assert!(client
        .try_claim_split(&id, &recipient, &100i128, &salt, &relayer, &fee)
        .is_err());
}

#[test]
fn test_split_claim_exceeds_allocation_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 4);
    let expiry = env.ledger().timestamp() + 1000;
    let recipient = Address::generate(&env);

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &vec![&env, recipient.clone()],
        &vec![&env, 1000i128],
        &0u32,
    );

    let salt = make_salt(&env, 0);
    let (relayer, fee) = no_relayer(&env);

    assert!(client
        .try_claim_split(&id, &recipient, &1001i128, &salt, &relayer, &fee)
        .is_err());
}

#[test]
#[should_panic(expected = "not a recipient of this link")]
fn test_split_claim_by_non_recipient_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 5);
    let expiry = env.ledger().timestamp() + 1000;
    let recipient = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &vec![&env, recipient.clone()],
        &vec![&env, 1000i128],
        &0u32,
    );

    let salt = make_salt(&env, 0);
    let (relayer, fee) = no_relayer(&env);
    client.claim_split(&id, &stranger, &1000i128, &salt, &relayer, &fee);
}

#[test]
fn test_split_duplicate_recipient_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 6);
    let expiry = env.ledger().timestamp() + 1000;
    let recipient = Address::generate(&env);

    assert!(client
        .try_create_split_link(
            &id,
            &0u32,
            &Bytes::new(&env),
            &token,
            &expiry,
            &sender,
            &vec![&env, recipient.clone(), recipient.clone()],
            &vec![&env, 500i128, 500i128],
            &0u32,
        )
        .is_err());
}

#[test]
fn test_split_recipients_shares_length_mismatch_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 7);
    let expiry = env.ledger().timestamp() + 1000;
    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);

    assert!(client
        .try_create_split_link(
            &id,
            &0u32,
            &Bytes::new(&env),
            &token,
            &expiry,
            &sender,
            &vec![&env, r1, r2],
            &vec![&env, 1000i128],
            &0u32,
        )
        .is_err());
}

#[test]
fn test_split_zero_recipients_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 8);
    let expiry = env.ledger().timestamp() + 1000;

    assert!(client
        .try_create_split_link(
            &id,
            &0u32,
            &Bytes::new(&env),
            &token,
            &expiry,
            &sender,
            &Vec::<Address>::new(&env),
            &Vec::<i128>::new(&env),
            &0u32,
        )
        .is_err());
}

// Property-style test: for a range of split configurations, whatever the
// mix of full claims, partial claims, and a mid-flight cancellation, every
// stroop that left the escrow lands in exactly one of "paid to a recipient"
// or "returned to the creator" — nothing is minted, burned, or stuck.
#[test]
fn test_split_balance_conservation_across_claim_and_cancel_combinations() {
    for seed in 0u8..6 {
        let env = Env::default();
        env.mock_all_auths();

        let (client, _verifier, sender, token) = setup_test(&env);
        let id = make_link_hash(&env, 100 + seed);
        let expiry = env.ledger().timestamp() + 1000;

        let recipients_addrs = vec![
            &env,
            Address::generate(&env),
            Address::generate(&env),
            Address::generate(&env),
        ];
        let shares = vec![&env, 300i128, 300i128, 400i128];
        let total = 1000i128;

        client.create_split_link(
            &id,
            &0u32,
            &Bytes::new(&env),
            &token,
            &expiry,
            &sender,
            &recipients_addrs,
            &shares,
            &0u32,
        );

        let token_client = TokenClient::new(&env, &token);
        let (relayer, relayer_fee) = (Address::generate(&env), 10i128 * (seed as i128 % 3));
        let mut paid_to_recipients: i128 = 0;
        let mut paid_to_relayer: i128 = 0;

        let salt = make_salt(&env, 0);

        // Recipient 0 always fully claims.
        let r0 = recipients_addrs.get(0).unwrap();
        client.claim_split(&id, &r0, &300i128, &salt, &relayer, &relayer_fee);
        paid_to_recipients += 300 - relayer_fee;
        paid_to_relayer += relayer_fee;

        // Recipient 1 partially claims when seed is even, leaving the rest
        // for the sender's cancellation; fully claims when seed is odd.
        let r1 = recipients_addrs.get(1).unwrap();
        let claim1 = if seed % 2 == 0 { 150i128 } else { 300i128 };
        client.claim_split(&id, &r1, &claim1, &salt, &Address::generate(&env), &0i128);
        paid_to_recipients += claim1;

        // Recipient 2 never claims.

        let sender_balance_before_cancel = token_client.balance(&sender);
        client.cancel_split_link(&id);
        let returned_to_creator = token_client.balance(&sender) - sender_balance_before_cancel;

        let escrowed_after = token_client.balance(&client.address);
        assert_eq!(escrowed_after, 0, "seed {seed}: escrow must be fully drained");
        assert_eq!(
            paid_to_recipients + paid_to_relayer + returned_to_creator,
            total,
            "seed {seed}: every stroop must be accounted for"
        );
        assert_eq!(
            token_client.balance(&r0) + token_client.balance(&r1),
            paid_to_recipients,
            "seed {seed}: recipient balances must match what was claimed"
        );

        // Cancellation is terminal: no further claims, even from the
        // recipient who never claimed.
        let r2 = recipients_addrs.get(2).unwrap();
        assert!(client
            .try_claim_split(&id, &r2, &400i128, &salt, &relayer, &0i128)
            .is_err());
    }
}

#[test]
#[should_panic(expected = "cancel window closed")]
fn test_split_cancel_after_expiry_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 9);
    let expiry = env.ledger().timestamp() + 1;

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &vec![&env, Address::generate(&env)],
        &vec![&env, 1000i128],
        &0u32,
    );

    env.ledger().set_timestamp(expiry + 1);
    client.cancel_split_link(&id);
}

#[test]
fn test_split_refund_after_expiry_returns_unclaimed_remainder() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 10);
    let expiry = env.ledger().timestamp() + 1000;
    let recipient = Address::generate(&env);

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &vec![&env, recipient.clone()],
        &vec![&env, 1000i128],
        &0u32,
    );

    // Partially claim before expiry.
    let salt = make_salt(&env, 0);
    let (relayer, fee) = no_relayer(&env);
    client.claim_split(&id, &recipient, &400i128, &salt, &relayer, &fee);

    env.ledger().set_timestamp(expiry + 1);
    client.refund_split_link(&id);

    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), 400i128);
    assert_eq!(token_client.balance(&sender), 10000i128 - 400i128);
    assert_eq!(token_client.balance(&client.address), 0);

    // Terminal: refunding twice must fail.
    assert!(client.try_refund_split_link(&id).is_err());
}

#[test]
fn test_split_refund_before_expiry_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 11);
    let expiry = env.ledger().timestamp() + 1000;

    client.create_split_link(
        &id,
        &0u32,
        &Bytes::new(&env),
        &token,
        &expiry,
        &sender,
        &vec![&env, Address::generate(&env)],
        &vec![&env, 1000i128],
        &0u32,
    );

    assert!(client.try_refund_split_link(&id).is_err());
}

#[test]
fn test_split_email_restricted_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, verifier, sender, token) = setup_test(&env);
    let id = make_link_hash(&env, 12);
    let expiry = env.ledger().timestamp() + 1000;
    let recipient = Address::generate(&env);
    let intended_hash = email_hash(&env, "alice@example.com");
    let policy_params = Bytes::from_array(&env, &intended_hash.to_array());

    client.create_split_link(
        &id,
        &1u32,
        &policy_params,
        &token,
        &expiry,
        &sender,
        &vec![&env, recipient.clone()],
        &vec![&env, 1000i128],
        &0u32,
    );

    let salt = make_salt(&env, 0x9A);
    let (relayer, fee) = no_relayer(&env);

    // No email attestation recorded yet — claim must fail.
    assert!(client
        .try_claim_split(&id, &recipient, &1000i128, &salt, &relayer, &fee)
        .is_err());

    let email_key = blinded_key(
        &env,
        EMAIL_DOMAIN,
        &id,
        &strkey_ascii(&recipient),
        Some(&intended_hash.to_array()),
        &salt,
    );
    MockVerifierClient::new(&env, &verifier).attest_email(&email_key);

    client.claim_split(&id, &recipient, &1000i128, &salt, &relayer, &fee);
    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&recipient), 1000i128);
}
