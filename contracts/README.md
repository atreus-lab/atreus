# Atreus Contracts

Soroban smart contracts for the Atreus protocol on Stellar.

## Contracts

### AtreusContract — Core Escrow

| Function | What it does |
|----------|-------------|
| `__constructor(verifier: Address)` | Stores the verifier contract address in instance storage |
| `create_link(id, policy_type, policy_params, amount, asset, expiry, sender)` | Escrows tokens from sender, stores link info, emits `("created", id)` |
| `claim_link(link_hash, recipient, claim_salt, relayer_address, relayer_fee)` | Recomputes the blinded `claim_key`, checks that `VerifierContract.is_attested(claim_key)` returns true, rejects an already-claimed link, pays the relayer fee and the remainder to the recipient, emits `("claimed",)` with no data |
| `refund_link(link_hash)` | Creator reclaims tokens after expiry |
| `create_split_link(id, policy_type, policy_params, asset, expiry, sender, recipients, shares, min_claim_bps)` | Multi-recipient / partial-claim escrow (#120). Escrows `sum(shares)`, one allocation per `recipients[i]`. A single recipient is the "partial claims" mode; several is "split recipients". Emits `("splitnew", id)`. |
| `claim_split(link_hash, recipient, claim_amount, claim_salt, relayer_address, relayer_fee)` | Claims up to `claim_amount` from `recipient`'s remaining allocation. Gated by `recipient.require_auth()` only — no ZK attestation, since split recipients are named `Address`es at creation rather than bearer-secret holders — plus `claim_link`'s email-policy check when `policy_type == 1`. Non-final partial claims must clear `min_claim_bps`; closing out the exact remainder always succeeds. Emits `("splitclm",)` with no data. |
| `cancel_split_link(link_hash)` | Creator-only clawback of every recipient's unclaimed remainder, only before `expires_at`. Already-claimed amounts are untouched. Terminal — closes the link. |
| `refund_split_link(link_hash)` | Creator-only sweep of the unclaimed remainder after `expires_at`, the split-link analogue of `refund_link`. Terminal. |

See [`docs/architecture.md`](../docs/architecture.md) §5.1 for the split-link state machine and cancel/claim precedence rules.

**Data structures:**

```rust
pub struct LinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub asset: Address,
    pub policy_type: u32,
    pub policy_params: Bytes,
    pub expires_at: u64,
    pub claimed: bool,
}
```

**Attestation gate:** `claim_link` calls `VerifierContract.is_attested(claim_key)` via cross-contract invocation and panics if false. Only claims backed by a verified ZK proof succeed. The claimer no longer passes the secret: transaction arguments are public, and the attestation already proves knowledge of it.

**Blinded keys (interface spec v1):** the attester and the contract derive the same
keys off-chain and on-chain, so no argument, storage key, or event joins a link to
its claimer.

```
claim_key = sha256("ATREUS_CLAIM_V1" || link_hash(32) || recipient_strkey(56) || salt(32))
email_key = sha256("ATREUS_EMAIL_V1" || link_hash(32) || recipient_strkey(56) || email_hash(32) || salt(32))
```

The 32-byte salt is chosen by the attester and given to the recipient, who passes it
as `claim_salt`.

### VerifierContract — ZK Attestation Oracle

| Function | What it does |
|----------|-------------|
| `__constructor(verification_key, attester)` | Stores the verification key and trusted attester address |
| `attest(attester, claim_key)` | Requires the stored attester to authenticate. Records that a valid UltraHonk proof was verified off-chain, under the blinded `claim_key`. |
| `is_attested(claim_key) -> bool` | Read-only check used by `claim_link` to verify a proof was attested |
| `attest_email(attester, email_key)` / `is_email_attested(email_key) -> bool` | Same pattern for the email-restricted policy (`policy_type == 1`) |
| `mark_nullifier(attester, nullifier)` / `is_nullifier_used(nullifier) -> bool` | Durable replay-protection registry |
| `submit_proof(recipient, proof)` | Validates UltraHonk proof format and emits an event (logging function) |
| `verify_proof(public_inputs, proof) -> bool` | On-chain BN254 pairing verification — placeholder until Soroban adds native BN254 host functions (CAP-0074) |

## Tests

27 tests in `atreus-contract/src/test.rs`, 24 in `verifier-contract/src/test.rs`.
Notable ones:

| Test | What it verifies |
|------|-----------------|
| `test_blinded_keys_match_frozen_spec_vectors` | Both key derivations against the fixtures the backend and frontend share |
| `test_claimed_event_carries_no_link_or_recipient` | The `claimed` event has one topic and void data |
| `test_wrong_salt_fails` | A wrong salt derives a different key → `no valid ZK attestation for this claim` |
| `test_double_claim_fails` | The `claimed` flag stops a second claim |
| `test_email_restricted_claim` | Email-restricted policy through the blinded `email_key` |
| `test_attested_event_carries_no_data` | Verifier events publish no key material |
| `test_split_partial_claims_accumulate_to_full_allocation` | Two partial claims (one below, one closing the remainder) sum to a recipient's full share |
| `test_split_balance_conservation_across_claim_and_cancel_combinations` | Balance-conservation property test: across full/partial claims plus a mid-flight cancel, every stroop lands as a recipient payout, a relayer fee, or a creator refund — never stuck or duplicated |
| `test_split_cancel_after_expiry_fails` / `test_split_refund_before_expiry_fails` | `cancel_split_link` and `refund_split_link` enforce disjoint, non-overlapping time windows |

```bash
cd contracts
cargo test --all    # 51 passed, 0 failed
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Blockchain | Stellar (Soroban) |
| Language | Rust |
| SDK | `soroban-sdk` 22.0.0 |
| Build target | `wasm32-unknown-unknown` |

## Getting Started

```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test -p atreus-contract

# Deploy (requires Stellar CLI + funded account)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/atreus_contract.wasm \
  --source-account <YOUR_KEY> \
  --network testnet
```

## Project Structure

```
contracts/
├── Cargo.toml                        # Workspace root
├── atreus-contract/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                    # Escrow contract logic
│       └── test.rs                   # Unit tests
└── verifier-contract/
    ├── Cargo.toml
    └── src/
        ├── lib.rs                    # ZK attestation oracle
        └── test.rs                   # Unit tests
```

## Deployed Contracts (Testnet)

| Contract | ID |
|----------|-----|
| VerifierContract | `CD2WRLVL4LRRQTCNC5BB2Q4PAJKVHHGB7GNPM6DFF4QNBC3M3E2XHOMI` |
| AtreusContract | `CA4MP4JAPWRJO7XX3UFDN3L2IIJBAOCBLGO6Y34EDDNZTIKGXGTFZ5NR` |

## License

MIT
