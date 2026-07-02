# Atreus Contracts

Soroban smart contracts for the Atreus protocol on Stellar.

## Contracts

### `atreus-contract` — Core Escrow

| Function | Signature | What it does |
|----------|-----------|-------------|
| `__constructor` | `(env, verifier: Address)` | Stores verifier address in instance storage |
| `create_link` | `(id, policy_type, policy_params, amount, asset, expiry, sender)` | Escrows tokens from sender, stores `LinkInfo`, emits `("created", id)` |
| `claim_link` | `(link_hash, recipient, secret)` | Verifies `sha256(secret) == link_hash`, **requires `VerifierContract.is_attested(link_hash, recipient) == true`** (real ZK proof verified off-chain by the attester, see below), checks not claimed/expired, nullifier prevents double-claim, transfers to recipient, emits `("claimed", link_hash)` |
| `refund_link` | `(link_hash)` | Creator reclaims after expiry, removes from storage, emits `("refunded", link_hash)` |

**Data structures:**

```rust
pub struct LinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub asset: Address,
    pub policy_type: u32,       // 0 = secret
    pub policy_params: Bytes,   // empty for secret policy
    pub expires_at: u64,
    pub claimed: bool,
}

pub enum DataKey {
    VerifierAddress,
}
```

**Nullifier:** `sha256(link_hash)` stored in `temporary` storage. Checked before every claim. (Separate from
the ZK circuit's own Pedersen-domain nullifier — see verifier-contract section below.)

**Attestation gate (current, real):** `claim_link` calls `VerifierContract.is_attested(link_hash, recipient)`
via cross-contract invocation and panics if false. This is the actual ZK-gating check — see
[Part B in the contracts walkthrough](./walkthrough/allwalkthrough.md) for why an off-chain attester is used
instead of a native on-chain pairing check.

### `verifier-contract` — ZK Attestation Oracle

| Function | Signature | What it does |
|----------|-----------|-------------|
| `__constructor` | `(env, verification_key: Bytes, attester: Address)` | Stores VK + the trusted attester address |
| `attest` | `(env, attester: Address, link_hash: BytesN<32>, recipient: Address)` | Requires `attester.require_auth()` and that it matches the stored trusted attester. Records that a real UltraHonk proof for this `(link_hash, recipient)` pair was verified off-chain. This is the real gate `claim_link` checks. |
| `is_attested` | `(env, link_hash: BytesN<32>, recipient: Address) -> bool` | Read-only check used by `claim_link` |
| `submit_proof` | `(env, recipient: Address, proof: Bytes)` | Validates 2144-byte UltraHonk proof format, emits an event. Not part of the claim-gating path — a receipt/logging function only. |
| `verify_proof` | `(env, public_inputs: Bytes, proof: Bytes) -> bool` | **Not the real gate.** On-chain BN254 pairing verification isn't available on Soroban yet (CAP-0074 proposed, not implemented) — see the doc comment on this function in `src/lib.rs` for the full explanation. Kept in the contract as a placeholder for once native verification ships. |
| `verification_key` | `(env) -> Bytes` | Returns stored VK |

**Why an attester instead of on-chain verification:** the circuit (Noir + Barretenberg) produces UltraHonk
proofs over BN254. Soroban has native pairing checks for BLS12-381 (CAP-0059, live), but not BN254
(CAP-0074, still proposed) — so there's no host function to verify this proof inside the contract VM today.
`attest`/`is_attested` implement the attestation-oracle pattern instead: a backend service (`backend/`)
generates the expected public inputs from the claim's own secret, verifies the real proof against them with
`bb.js` off-chain, and — only if valid — signs and submits `attest()` with a dedicated trusted keypair. This
is a documented, explicit trust assumption (single attester = single point of failure/trust), not a
trustless verification path; it's removable once CAP-0074 lands and a native BN254 verifier can replace it.

## Tests

5 tests in `atreus-contract/src/test.rs`:

| Test | What it verifies |
|------|-----------------|
| `test_create_and_claim` | Happy path: create link → claim with correct secret |
| `test_wrong_secret_fails` | Wrong secret → `try_claim_link()` returns `Err` |
| `test_double_claim_fails` | Second claim → `try_claim_link()` returns `Err` |
| `test_refund_after_expiry` | Creator reclaims after expiry |
| `test_claim_expired_fails` | Claim after expiry → `try_claim_link()` returns `Err` |

Tests use `client.try_claim_link()` (Soroban SDK's auto-generated `try_` variant) instead of `std::panic::catch_unwind` — avoids `UnwindSafe` issues from `Env`'s `RefCell`.

```bash
cd contracts
cargo test -p atreus-contract    # 5 passed, 0 failed
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Blockchain | Stellar (Soroban) |
| Language | Rust |
| SDK | `soroban-sdk` 22.0.0 |
| ZK (circuit) | Noir 1.0.0-beta.22 |
| ZK (proving) | Barretenberg `@aztec/bb.js@5.0.0-nightly.20260522` — real proof gen + verification working (see walkthrough Part B for the version-pin fix) |
| ZK (on-chain gating) | Attestation oracle (`backend/`) — see verifier-contract section above |
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
├── Cargo.toml                    # Workspace root
├── atreus-contract/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                # Contract logic (137 lines)
│       └── test.rs               # Unit tests (119 lines)
└── verifier-contract/
    ├── Cargo.toml
    └── src/
        └── lib.rs                # ZK attestation oracle
```

## Deployed Contracts (Testnet)

| Contract | ID |
|----------|-----|
| VerifierContract | `CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD` |
| AtreusContract | `CCZSFPZ6XPZBUPBGQ5FRP5BMW5HKZIZNCWPLJAHNOWP4ZI7BZSMJDTCD` |

Deployer identity: `atreus-deployer` (Stellar CLI, testnet, funded via friendbot).

## License

MIT
