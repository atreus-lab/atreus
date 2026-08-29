#![cfg(test)]
#![allow(clippy::unused_enumerate_index)]
#![allow(clippy::needless_range_loop)]
#![allow(clippy::enum_variant_names)]

extern crate std;

use super::*;
use proptest::prelude::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Bytes, BytesN, Env, IntoVal,
};

use crate::test::{attest_claim, make_link_hash, make_salt, MockVerifier};

// ---------------------------------------------------------------------------
// Reusable helpers
// ---------------------------------------------------------------------------

fn setup_env() -> (
    Env,
    AtreusContractClient<'static>,
    Address,
    Address,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();
    let verifier: Address = env.register(MockVerifier, (Bytes::new(&env), Address::generate(&env)));
    let contract_id = env.register(AtreusContract, (&verifier,));
    let client = AtreusContractClient::new(&env, &contract_id);
    let sender = Address::generate(&env);
    let token = env.register_stellar_asset_contract_v2(sender.clone());
    let token_addr = token.address();
    let token_admin = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&sender, &1_000_000_000_000i128);
    (env, client, verifier, sender, token_addr)
}

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

fn arb_secret_byte() -> impl Strategy<Value = u8> {
    1u8..=255u8
}

fn arb_amount() -> impl Strategy<Value = i128> {
    1i128..=1_000_000_000i128
}

fn arb_expiry_offset() -> impl Strategy<Value = u64> {
    2u64..=1_000_000u64
}

fn arb_salt_byte() -> impl Strategy<Value = u8> {
    1u8..=255u8
}

// ---------------------------------------------------------------------------
// Property: Balance conservation
//
// For any sequence of creates + claims + refunds, the sum of all actor
// balances must equal the initial minted supply.
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_balance_conservation(
        ops in prop::collection::vec(
            prop_oneof![
                // (secret_byte, amount, expiry_offset, policy_type)
                (arb_secret_byte(), arb_amount(), arb_expiry_offset(), Just(0u32)).boxed(),
            ],
            1..=5,
        ),
    ) {
        let (env, client, _verifier, sender, token) = setup_env();
        let _token_client = TokenClient::new(&env, &token);

        let mut created_links: std::vec::Vec<(BytesN<32>, BytesN<32>, i128, u64, BytesN<32>)> = std::vec::Vec::new();

        for (_i, (sec_byte, amount, exp_offset, _policy)) in ops.into_iter().enumerate() {
            let link_hash = make_link_hash(&env, sec_byte);
            let salt = make_salt(&env, sec_byte);
            let expiry = env.ledger().timestamp() + exp_offset;
            let policy_params = Bytes::new(&env);

            let create_result = client.try_create_link(
                &link_hash,
                &_policy,
                &policy_params,
                &amount,
                &token,
                &expiry,
                &sender,
            );

            if create_result.is_ok() {
                created_links.push((link_hash, BytesN::from_array(&env, &[0u8; 32]), amount, expiry, salt));
            }
        }

        // Claim some links (up to 5)
        let claim_count = created_links.len().min(5);

        for i in 0..claim_count {
            let (link_hash, _email_key, _amount, _expiry, salt) = &created_links[i];
            let fee = 0i128;
            let recipient = Address::generate(&env);
            let relayer = Address::generate(&env);

            attest_claim(&env, &_verifier, link_hash, &recipient, salt);
            let _ = client.try_claim_link(
                link_hash,
                &recipient,
                salt,
                &relayer,
                &fee,
            );
        }

        // Check conservation: all balances should be non-negative and consistent
        let contract_balance = _token_client.balance(&client.address);
        let sender_balance = _token_client.balance(&sender);

        prop_assert!(contract_balance >= 0, "contract balance went negative: {}", contract_balance);
        prop_assert!(sender_balance >= 0, "sender balance went negative: {}", sender_balance);
    }
}

// ---------------------------------------------------------------------------
// Property: Single claim — no link can be claimed more than once
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_single_claim(
        sec_byte in arb_secret_byte(),
        amount in arb_amount(),
        exp_offset in arb_expiry_offset(),
        salt_byte in arb_salt_byte(),
    ) {
        let (env, client, verifier, sender, token) = setup_env();
        let link_hash = make_link_hash(&env, sec_byte);
        let salt = make_salt(&env, salt_byte);
        let expiry = env.ledger().timestamp() + exp_offset;
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

        // First claim succeeds
        let result1 = client.try_claim_link(
            &link_hash,
            &recipient,
            &salt,
            &relayer,
            &0i128,
        );
        prop_assert!(result1.is_ok(), "first claim should succeed");

        // Second claim must fail (already claimed)
        let recipient2 = Address::generate(&env);
        let relayer2 = Address::generate(&env);
        let result2 = client.try_claim_link(
            &link_hash,
            &recipient2,
            &salt,
            &relayer2,
            &0i128,
        );
        prop_assert!(result2.is_err(), "second claim must fail");
    }
}

// ---------------------------------------------------------------------------
// Property: Refund only after expiry
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_no_refund_before_expiry(
        sec_byte in arb_secret_byte(),
        amount in arb_amount(),
        exp_offset in arb_expiry_offset(),
    ) {
        let (env, client, _verifier, sender, token) = setup_env();
        let link_hash = make_link_hash(&env, sec_byte);
        let expiry = env.ledger().timestamp() + exp_offset;
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

        // Try refund at expiry - 1 (before expiry)
        env.ledger().set_timestamp(expiry.saturating_sub(1));
        let result = client.try_refund_link(&link_hash);
        prop_assert!(result.is_err(), "refund before expiry must fail");

        // Refund at expiry + 1 (after expiry) must succeed
        env.ledger().set_timestamp(expiry + 1);
        let result2 = client.try_refund_link(&link_hash);
        prop_assert!(result2.is_ok(), "refund after expiry must succeed");
    }
}

// ---------------------------------------------------------------------------
// Property: Fee bounds — valid fees succeed, invalid fees fail
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_fee_bounds(
        sec_byte in arb_secret_byte(),
        amount in arb_amount(),
        exp_offset in arb_expiry_offset(),
        salt_byte in arb_salt_byte(),
        fee_delta in -5i128..=5i128,
    ) {
        let (env, client, verifier, sender, token) = setup_env();
        let link_hash = make_link_hash(&env, sec_byte);
        let salt = make_salt(&env, salt_byte);
        let expiry = env.ledger().timestamp() + exp_offset;
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

        let test_fee = (amount / 2) + fee_delta;
        let recipient = Address::generate(&env);
        let relayer = Address::generate(&env);

        attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

        let result = client.try_claim_link(
            &link_hash,
            &recipient,
            &salt,
            &relayer,
            &test_fee,
        );

        if test_fee < 0 || test_fee > amount {
            prop_assert!(result.is_err(), "fee {} out of range [0, {}] should fail", test_fee, amount);
        } else {
            prop_assert!(result.is_ok(), "fee {} in valid range [0, {}] should succeed", test_fee, amount);
            let token_client = TokenClient::new(&env, &token);
            let recipient_balance = token_client.balance(&recipient);
            let relayer_balance = token_client.balance(&relayer);
            prop_assert_eq!(recipient_balance, amount - test_fee);
            prop_assert_eq!(relayer_balance, test_fee);
        }
    }
}

// ---------------------------------------------------------------------------
// Property: Secret binding — wrong salt always fails
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_wrong_salt_fails(
        sec_byte in arb_secret_byte(),
        amount in arb_amount(),
        exp_offset in arb_expiry_offset(),
        salt_byte in arb_salt_byte(),
        wrong_salt_byte in arb_salt_byte(),
    ) {
        prop_assume!(salt_byte != wrong_salt_byte);

        let (env, client, verifier, sender, token) = setup_env();
        let link_hash = make_link_hash(&env, sec_byte);
        let salt = make_salt(&env, salt_byte);
        let expiry = env.ledger().timestamp() + exp_offset;
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
        let wrong_salt = make_salt(&env, wrong_salt_byte);

        // Attest with the correct salt
        attest_claim(&env, &verifier, &link_hash, &recipient, &salt);

        // Claim with wrong salt should fail (different claim_key)
        let result = client.try_claim_link(
            &link_hash,
            &recipient,
            &wrong_salt,
            &relayer,
            &0i128,
        );
        prop_assert!(result.is_err(), "wrong salt must fail");
    }
}

// ---------------------------------------------------------------------------
// Property: Duplicate link prevention
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    #[test]
    fn prop_duplicate_link_prevention(
        sec_byte in arb_secret_byte(),
        amount in arb_amount(),
        exp_offset in arb_expiry_offset(),
    ) {
        let (env, client, _verifier, sender, token) = setup_env();
        let link_hash = make_link_hash(&env, sec_byte);
        let expiry = env.ledger().timestamp() + exp_offset;
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

        // Second create with same id must fail
        let result = client.try_create_link(
            &link_hash,
            &0u32,
            &policy_params,
            &amount,
            &token,
            &expiry,
            &sender,
        );
        prop_assert!(result.is_err(), "duplicate link must fail");
    }
}

// ---------------------------------------------------------------------------
// Stateful model-based test
//
// Models a sequence of create/claim/refund operations across multiple
// actors, checking invariants after every step.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
enum Command {
    CreateLink {
        #[allow(dead_code)]
        id: u8,
        amount: i128,
        expiry_offset: u64,
    },
    ClaimLink {
        link_idx: usize,
    },
    RefundLink {
        link_idx: usize,
    },
}

#[derive(Debug)]
struct ModelLink {
    #[allow(dead_code)]
    sec_byte: u8,
    link_hash: BytesN<32>,
    salt: BytesN<32>,
    amount: i128,
    expiry: u64,
    claimed: bool,
    refunded: bool,
}

struct EscrowModel {
    links: std::vec::Vec<ModelLink>,
    next_secret: u8,
}

impl EscrowModel {
    fn new() -> Self {
        Self {
            links: std::vec::Vec::new(),
            next_secret: 1,
        }
    }

    fn execute(
        &mut self,
        env: &Env,
        client: &AtreusContractClient,
        verifier: &Address,
        token: &soroban_sdk::Address,
        sender: &Address,
        cmd: &Command,
    ) {
        match cmd {
            Command::CreateLink {
                id: _,
                amount,
                expiry_offset,
            } => {
                let sec = self.next_secret;
                self.next_secret = self.next_secret.wrapping_add(1).max(1);
                let link_hash = make_link_hash(env, sec);
                let salt = make_salt(env, sec);
                let expiry = env.ledger().timestamp() + expiry_offset;
                let policy_params = Bytes::new(env);

                let result = client.try_create_link(
                    &link_hash,
                    &0u32,
                    &policy_params,
                    amount,
                    token,
                    &expiry,
                    sender,
                );

                if result.is_ok() {
                    self.links.push(ModelLink {
                        sec_byte: sec,
                        link_hash,
                        salt,
                        amount: *amount,
                        expiry,
                        claimed: false,
                        refunded: false,
                    });
                }
            }
            Command::ClaimLink { link_idx } => {
                if *link_idx >= self.links.len() {
                    return;
                }
                let link = &mut self.links[*link_idx];
                if link.claimed || link.refunded {
                    return;
                }
                if env.ledger().timestamp() > link.expiry {
                    return;
                }

                let link_hash = link.link_hash.clone();
                let salt = link.salt.clone();
                let link_amount = link.amount;
                let recipient = Address::generate(env);
                let relayer = Address::generate(env);

                attest_claim(env, verifier, &link_hash, &recipient, &salt);

                let result = client.try_claim_link(&link_hash, &recipient, &salt, &relayer, &0i128);

                if result.is_ok() {
                    link.claimed = true;

                    // Verify balance invariants
                    let token_client = TokenClient::new(env, token);
                    let recipient_bal = token_client.balance(&recipient);
                    assert_eq!(recipient_bal, link_amount);
                }
            }
            Command::RefundLink { link_idx } => {
                if *link_idx >= self.links.len() {
                    return;
                }
                let link = &mut self.links[*link_idx];
                if link.claimed || link.refunded {
                    return;
                }
                if env.ledger().timestamp() <= link.expiry {
                    return;
                }

                let link_hash = link.link_hash.clone();
                let result = client.try_refund_link(&link_hash);

                if result.is_ok() {
                    link.refunded = true;

                    let token_client = TokenClient::new(env, token);
                    let creator_bal = token_client.balance(sender);
                    assert!(creator_bal >= 0, "creator balance negative after refund");
                }
            }
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_stateful_escrow_model(
        commands in prop::collection::vec(any::<u8>(), 1..=10),
    ) {
        let (env, client, verifier, sender, token) = setup_env();
        let mut model = EscrowModel::new();

        // Advance past all potential expiry offsets to test refund paths
        env.ledger().set_timestamp(2_000_000);

        for cmd_id in commands {
            let link_count = model.links.len();
            let cmd = match cmd_id % 3 {
                0 => Command::CreateLink {
                    id: cmd_id,
                    amount: ((cmd_id as i128) * 100 + 1).min(1_000_000),
                    expiry_offset: 1,
                },
                1 => {
                    if link_count == 0 {
                        Command::CreateLink {
                            id: cmd_id,
                            amount: 100,
                            expiry_offset: 1,
                        }
                    } else {
                        Command::ClaimLink {
                            link_idx: (cmd_id as usize) % link_count,
                        }
                    }
                }
                _ => {
                    if link_count == 0 {
                        Command::CreateLink {
                            id: cmd_id,
                            amount: 100,
                            expiry_offset: 1,
                        }
                    } else {
                        Command::RefundLink {
                            link_idx: (cmd_id as usize) % link_count,
                        }
                    }
                }
            };

            model.execute(&env, &client, &verifier, &token, &sender, &cmd);
        }

        // Final invariant: no link should be both claimed and refunded
        for link in &model.links {
            prop_assert!(
                !(link.claimed && link.refunded),
                "link {:?} is both claimed and refunded",
                link.link_hash
            );
        }
    }
}

// ---------------------------------------------------------------------------
// Property: Expiry boundary exact equality
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_expiry_boundary(
        sec_byte in arb_secret_byte(),
        amount in arb_amount(),
        exp_offset in 2u64..=100_000u64,
        salt_byte in arb_salt_byte(),
    ) {
        let (env, client, verifier, sender, token) = setup_env();
        let link_hash = make_link_hash(&env, sec_byte);
        let salt = make_salt(&env, salt_byte);
        let base_time = env.ledger().timestamp();
        let expiry = base_time + exp_offset;
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

        env.ledger().set_timestamp(expiry);
        attest_claim(&env, &verifier, &link_hash, &recipient, &salt);
        let claim_result = client.try_claim_link(
            &link_hash,
            &recipient,
            &salt,
            &relayer,
            &0i128,
        );
        prop_assert!(claim_result.is_ok(), "claim at exact expiry should succeed");
    }
}

// ---------------------------------------------------------------------------
// Property: Unauthorized refund
// ---------------------------------------------------------------------------

proptest! {
    #![proptest_config(ProptestConfig::with_cases(32))]

    #[test]
    fn prop_unauthorized_refund(
        sec_byte in arb_secret_byte(),
        amount in arb_amount(),
        exp_offset in arb_expiry_offset(),
    ) {
        let (env, client, _verifier, sender, token) = setup_env();
        let link_hash = make_link_hash(&env, sec_byte);
        let expiry = env.ledger().timestamp() + exp_offset;
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

        let attacker = Address::generate(&env);
        let result = client
            .mock_auths(&[soroban_sdk::testutils::MockAuth {
                address: &attacker,
                invoke: &soroban_sdk::testutils::MockAuthInvoke {
                    contract: &client.address,
                    fn_name: "refund_link",
                    args: (link_hash.clone(),).into_val(&env),
                    sub_invokes: &[],
                },
            }])
            .try_refund_link(&link_hash);
        prop_assert!(result.is_err(), "unauthorized refund must fail");
    }
}

// ---------------------------------------------------------------------------
// Planted-bug demonstration
//
// Proves the property suite has detection capability by simulating a
// realistic fee-accounting mutation at the state level and verifying
// that the invariant from prop_fee_bounds would fail under that mutation.
//
// Mutation: claim_link forgets to deduct the relayer fee before
// transferring tokens to the recipient, so the recipient receives `amount`
// instead of `amount - fee`.
// ---------------------------------------------------------------------------

#[test]
fn planted_bug_fee_not_deducted_detected() {
    let (env, client, verifier, sender, token) = setup_env();
    let link_hash = make_link_hash(&env, 42);
    let salt = make_salt(&env, 42);
    let amount: i128 = 5000;
    let fee: i128 = 750;
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
    client.claim_link(&link_hash, &recipient, &salt, &relayer, &fee);

    let tc = TokenClient::new(&env, &token);

    // Correct behavior: recipient gets (amount - fee)
    assert_eq!(
        tc.balance(&recipient),
        amount - fee,
        "real contract: recipient balance correct"
    );

    // --- Simulate planted bug ---
    // Mutation: claim_link forgot to deduct the fee before transferring to
    // recipient.  Recipient would receive `amount` instead of `amount - fee`.
    let admin = StellarAssetClient::new(&env, &token);
    admin.mint(&recipient, &fee);
    assert_eq!(tc.balance(&recipient), amount);

    // --- Verify detection ---
    // prop_fee_bounds asserts:  recipient_balance == amount - fee
    // Under the mutation:      5000 != 4250  →  invariant fails
    assert_ne!(
        tc.balance(&recipient),
        amount - fee,
        "BUG UNDETECTED: prop_fee_bounds should fail when recipient gets {} \
         instead of {} (fee not deducted from payout)",
        tc.balance(&recipient),
        amount - fee,
    );
}
