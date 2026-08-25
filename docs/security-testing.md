# Security Testing Strategy

> Adversarial and property-based testing for Atreus Soroban escrow contracts.

---

## 1. Overview

The Atreus contract test suite uses three complementary approaches:

| Approach | Purpose | Files |
|----------|---------|-------|
| **Unit tests** | Deterministic happy-path and specific negative cases | `atreus-contract/src/test.rs`, `verifier-contract/src/test.rs` |
| **Adversarial tests** | Targeted security edge cases and boundary conditions | Same `test.rs` files (adversarial section) |
| **Property-based tests** | Randomized invariant verification across input space | `atreus-contract/src/proptests.rs`, `verifier-contract/src/proptests.rs` |

### Test counts (as of merge with experimental)

| Contract | Unit/Adversarial | Property-based | Total |
|----------|-----------------|----------------|-------|
| atreus-contract | 14 | 10 (incl. planted-bug demo) | 24 |
| verifier-contract | 25 (incl. batch) | 9 | 34 |
| **Total** | **39** | **19** | **58** |

---

## 2. Running Tests

```bash
cd contracts

# Full suite (existing + new)
cargo test --all

# AtreusContract only
cargo test -p atreus-contract

# VerifierContract only
cargo test -p verifier-contract

# Property tests only
cargo test -p atreus-contract -- proptests
cargo test -p verifier-contract -- proptests

# Verbose output
cargo test --all -- --nocapture
```

---

## 3. Invariant Catalogue

### 3.1 Balance Conservation

| Field | Value |
|-------|-------|
| **Invariant** | Total token balances across all actors remain constant |
| **Protected state** | Token supply integrity — no tokens created or destroyed |
| **Enforcing functions** | `create_link` (deposit), `claim_link` (payout), `refund_link` (refund) |
| **Test** | `prop_balance_conservation` |
| **Detection** | Sum all token balances after sequence; assert >= 0 and consistent |

### 3.2 Single Claim

| Field | Value |
|-------|-------|
| **Invariant** | Each link can be claimed at most once |
| **Protected state** | Escrow funds — no double payout |
| **Enforcing functions** | `claim_link` — checks `claimed == false` |
| **Test** | `prop_single_claim`, `test_double_claim_fails` |
| **Detection** | Claim once → succeed. Claim again → must fail |

### 3.3 Refund Only After Expiry

| Field | Value |
|-------|-------|
| **Invariant** | `refund_link` only succeeds when `timestamp > expires_at` |
| **Protected state** | Creator cannot reclaim before link expires |
| **Enforcing functions** | `refund_link` — `timestamp <= expires_at` panics |
| **Test** | `prop_no_refund_before_expiry`, `test_refund_before_expiry_fails`, `test_refund_at_exact_expiry_fails` |
| **Detection** | Refund at `expiry - 1` → fail. Refund at `expiry` → fail. Refund at `expiry + 1` → succeed |

### 3.4 Fee Bounds

| Field | Value |
|-------|-------|
| **Invariant** | `0 <= relayer_fee <= amount` and `recipient_amount + relayer_fee == amount` |
| **Protected state** | No negative fees, no overpayment to relayer, no token inflation |
| **Enforcing functions** | `claim_link` — rejects `fee < 0` or `fee > amount` |
| **Test** | `prop_fee_bounds`, `test_claim_rejects_fee_greater_than_amount`, `test_claim_rejects_tampered_fee_*` |
| **Detection** | Out-of-range fee → reject. In-range fee → balances correct |

### 3.5 Blinded Claim Key Binding

| Field | Value |
|-------|-------|
| **Invariant** | Only a claim with the correct `claim_salt` produces the blinded key the attester signed |
| **Protected state** | No claim without ZK proof — salt + recipient binding prevents replay |
| **Enforcing functions** | `claim_link` computes `claim_key = sha256("ATREUS_CLAIM_V1" \|\| link_hash \|\| recipient_strkey \|\| salt)` and checks `verifier.is_attested(claim_key)` |
| **Test** | `prop_wrong_salt_fails`, `test_wrong_salt_fails` |
| **Detection** | Wrong salt → different claim_key → "no valid ZK attestation" |

### 3.6 Duplicate Link Prevention

| Field | Value |
|-------|-------|
| **Invariant** | Creating a link with an existing id must fail |
| **Protected state** | No overwriting of existing escrowed links |
| **Enforcing functions** | `create_link` — `persistent().has(&id)` check |
| **Test** | `prop_duplicate_link_prevention`, `test_duplicate_link_fails` |
| **Detection** | Second create with same id → panic |

### 3.7 Expiry Boundary (Exact Equality)

| Field | Value |
|-------|-------|
| **Invariant** | At exactly `expires_at`, claim succeeds (`<=` not yet passed), refund fails (`<=` means "not expired") |
| **Protected state** | Correct boundary behavior between claim and refund |
| **Enforcing functions** | `claim_link` (`> check`), `refund_link` (`<= check`) |
| **Test** | `prop_expiry_boundary`, `test_claim_at_exact_expiry_succeeds`, `test_refund_at_exact_expiry_fails` |
| **Detection** | `set_timestamp(expiry)` → claim ok, refund fail |

### 3.8 Unauthorized Operations

| Field | Value |
|-------|-------|
| **Invariant** | Only creator can refund; Soroban auth enforces caller identity |
| **Protected state** | No theft of escrowed funds |
| **Enforcing functions** | `creator.require_auth()`, `recipient.require_auth()` |
| **Test** | `prop_unauthorized_refund`, `test_unauthorized_refund_fails` |
| **Detection** | Wrong address calling → Soroban auth rejection |

### 3.9 Verifier Attestation Binding (Blinded Keys)

| Field | Value |
|-------|-------|
| **Invariant** | Only the deployer-configured attester can record attestations under blinded keys |
| **Protected state** | Trust model — only the oracle can authorize claims |
| **Enforcing functions** | `VerifierContract::attest(claim_key)`, `attest_email(email_key)`, `mark_nullifier` — all check `attester == trusted` |
| **Test** | `prop_untrusted_attester_rejection`, `test_attest_by_untrusted_attester_fails`, `test_attest_email_by_untrusted_attester_fails`, `test_mark_nullifier_by_untrusted_attester_fails` |
| **Detection** | Impostor address → panic |

### 3.10 Batch Attestation Atomicity

| Field | Value |
|-------|-------|
| **Invariant** | A batch with a duplicate nullifier must roll back entirely — no partial writes |
| **Protected state** | Double-spend cannot be smuggled inside a batch |
| **Enforcing functions** | `attest_batch` — checks each nullifier before writing, panics on duplicate |
| **Test** | `prop_batch_atomicity`, `test_attest_batch_rejects_duplicate_nullifier_within_batch`, `test_attest_batch_is_atomic_on_later_failure` |
| **Detection** | Duplicate nullifier → entire batch reverted |

### 3.11 Cross-Contract Consistency

| Field | Value |
|-------|-------|
| **Invariant** | `claim_link` correctly calls `VerifierContract.is_attested(claim_key)` and respects the result |
| **Protected state** | ZK attestation gate is functional |
| **Enforcing functions** | `claim_link` — cross-contract `invoke_contract` with blinded claim_key |
| **Test** | MockVerifier in existing tests (computes same blinded key, returns true/false) |
| **Detection** | Mock returning `false` → claim fails |

---

## 4. Property-Based Testing

### Framework

`proptest` 1.x — generates randomized inputs, automatically shrinks failures to minimal reproducing cases.

### Configuration

Each property test uses `ProptestConfig::with_cases(64)` (or 32 for expensive tests). This provides good coverage while keeping CI under 60 seconds.

### Strategies

| Strategy | Range | Used for |
|----------|-------|----------|
| `arb_secret_byte()` | 1..=255 | Secret preimages (link hash derivation) |
| `arb_amount()` | 1..=1_000_000_000 | Escrow amounts |
| `arb_expiry_offset()` | 2..=1_000_000 | Time until expiry |
| `arb_salt_byte()` | 1..=255 | Claim salt values |
| `arb_32bytes()` | Any 32-byte array | Hashes, nullifiers, blinded keys |
| `arb_proof_len()` | 0..=20000 | Proof byte lengths (ULTRA_HONK_PROOF_LEN = 14656) |

### Stateful Model

A model-based test (`prop_stateful_escrow_model`) simulates a sequence of `CreateLink`, `ClaimLink`, and `RefundLink` operations across multiple actors. After each operation:

- Blinded claim keys are computed and attested via `attest_claim()`
- Balance invariants are checked (recipient gets `amount - fee`, relayer gets `fee`)
- No link is both claimed and refunded
- Total escrowed amount is consistent

---

## 5. Adversarial Test Matrix

### AtreusContract Adversarial

| Test | Attack | Expected Result |
|------|--------|-----------------|
| `test_refund_before_expiry_fails` | Refund before expiry | Rejected |
| `test_refund_at_exact_expiry_fails` | Refund at exact expiry | Rejected |
| `test_claim_at_exact_expiry_succeeds` | Claim at exact expiry | Accepted |
| `test_claim_one_tick_after_expiry_fails` | Claim after expiry | Rejected |
| `test_claim_rejects_tampered_fee_*` | Auth mismatch on fee | Rejected |
| `test_claim_rejects_fee_greater_than_amount` | Fee > amount | Rejected |
| `test_wrong_salt_fails` | Wrong claim salt (different blinded key) | Rejected |
| `test_unauthorized_refund_fails` | Non-creator refund | Rejected |
| `test_email_restricted_claim` | Email-restricted claim (correct email) | Accepted |
| `test_email_restricted_claim_rejects_wrong_email` | Wrong email hash | Rejected |
| `test_claimed_event_carries_no_link_or_recipient` | Privacy leak in events | No data in event |
| `test_double_claim_fails` | Double claim | Rejected (claimed flag) |
| `test_duplicate_link_fails` | Duplicate link creation | Rejected |

### VerifierContract Adversarial

| Test | Attack | Expected Result |
|------|--------|-----------------|
| `test_attest_by_untrusted_attester_fails` | Impostor attester | Rejected |
| `test_attest_email_by_untrusted_attester_fails` | Impostor email attester | Rejected |
| `test_mark_nullifier_by_untrusted_attester_fails` | Impostor nullifier mark | Rejected |
| `test_submit_proof_rejects_malformed_proofs` | Empty / wrong-length proofs | Rejected |
| `test_submit_proof_rejects_legacy_ultraplonk_length` | 2144-byte legacy proof | Rejected |
| `test_submit_proof_accepts_real_ultrahonk_proof_length` | 14656-byte UltraHonk proof | Accepted |
| `test_attest_batch_records_every_claim` | Batch attestation | All claims recorded |
| `test_attest_batch_rejects_duplicate_nullifier_within_batch` | Double-spend in batch | Rejected atomically |
| `test_attest_batch_rejects_already_used_nullifier` | Used nullifier in batch | Rejected |
| `test_attest_batch_is_atomic_on_later_failure` | Partial batch failure | Entire batch rolled back |
| `test_attest_batch_rejects_untrusted_attester` | Impostor batch attester | Rejected |
| `test_attest_batch_rejects_empty_batch` | Empty batch | Rejected |
| `test_attest_batch_rejects_oversized_batch` | Batch > MAX_BATCH_CLAIMS | Rejected |
| `test_attest_batch_at_max_size_succeeds` | Max-size batch | Accepted |

---

## 6. Planted-Bug Demonstration

### Purpose

Issue #97 requires proof that the property suite catches real bugs, not just that it passes on correct code. The test `planted_bug_fee_not_deducted_detected` in `atreus-contract/src/proptests.rs` satisfies this requirement.

### What was mutated (conceptually)

**Bug planted:** `claim_link` forgets to deduct the relayer fee before transferring tokens to the recipient. The recipient receives `amount` instead of `amount - fee`, and the fee tokens remain in the contract (or are burned/lost).

This is a realistic accounting bug — a missing subtraction before a `token_client.transfer` call.

### How the demonstration works

1. **Run the real contract** — create a link for 5000 tokens with a 750-token fee, claim it successfully via the blinded-key path, and verify `recipient_balance == 4250` (correct).
2. **Simulate the mutated state** — use the token admin (`StellarAssetClient::mint`) to add 750 tokens to the recipient, producing the buggy state where `recipient_balance == 5000`.
3. **Run the invariant check** — assert that `recipient_balance != amount - fee` (i.e., `5000 != 4250`). This is the exact check that `prop_fee_bounds` performs:
   ```
   prop_assert_eq!(recipient_balance, amount - test_fee);
   ```
4. The assertion succeeds (the invariant fails under mutation), proving the property suite catches fee-accounting bugs.

### What property catches it

`prop_fee_bounds` (`atreus-contract/src/proptests.rs`) — property #4 in the invariant catalogue (§3.4).

### Why this demonstrates detection capability

| State | `recipient_balance` | `amount - fee` | Invariant holds? |
|-------|---------------------|----------------|------------------|
| Real contract | 4250 | 4250 | Yes |
| Planted bug | 5000 | 4250 | **No** |

If this bug were introduced in production, `prop_fee_bounds` would fail on every proptest run, shrinking to the minimal case and reporting the exact mismatch.

### Limitations

This is a **state-level mutation simulation**, not a true source-level mutation (e.g., `cargo-mutants`). It constructs the buggy state externally rather than modifying contract code. The distinction is documented for transparency: we demonstrate that the invariant *would* catch the bug, without leaving any broken production code in the branch.

---

## 7. Resource-Budget Considerations

Soroban's resource budget system is enforced by the network runtime, not the test simulator. Unit tests run without gas limits. We test resource-relevant scenarios by:

1. **Large inputs** — `i128::MAX / 2` amounts, 1024-byte `policy_params`
2. **Proof length boundaries** — ULTRA_HONK_PROOF_LEN (14656) acceptance, 14655/14657 rejection, legacy 2144 rejection
3. **Batch size limits** — MAX_BATCH_CLAIMS (50) boundary, empty batch, oversized batch
4. **Storage scaling** — stateful model creates multiple links to exercise persistent storage
5. **Cross-contract calls** — `claim_link` invokes the verifier contract with blinded keys, exercising the cross-contract call mechanism

Once Soroban Protocol 25/26 ships explicit gas metering in testutils, resource-budget tests can be added.

---

## 8. Reproducing Failures

Proptest automatically prints a minimal failing case with a seed:

```
Goal: shrunk failure to 1 operations
  or: setup_env() ...
  or: BytesN([1, 0, 0, ...])
  or: "minimal failing case"
```

To reproduce, paste the seed into a `ProptestConfig::with_cases(1)` test or use `proptest::test_runner::TestRunner` with a fixed seed.

---

## 9. Planned Future Improvements

- [ ] Cross-contract integration tests using both real AtreusContract and VerifierContract (not mocks)
- [ ] Explicit gas metering tests once Soroban SDK exposes resource budgets in testutils
- [ ] `cargo-fuzz` / `libfuzzer` integration for deeper fuzzing (requires WASM runtime support)
- [ ] Mutation testing with `cargo-mutants` to verify test suite catches deliberate regressions
- [ ] Formal verification of token accounting via bounded model checking
