# Atreus Contracts

Soroban smart contracts for the Atreus protocol on Stellar.

## Contracts

### `atreus-contract` — Core Escrow

| Function | Signature | What it does |
|----------|-----------|-------------|
| `__constructor` | `(env, verifier: Address)` | Stores verifier address in instance storage |
| `create_link` | `(id, policy_type, policy_params, amount, asset, expiry, sender)` | Escrows tokens from sender, stores `LinkInfo`, emits `("created", id)` |
| `claim_link` | `(link_hash, recipient, secret)` | Verifies `sha256(secret) == link_hash`, checks not claimed/expired, nullifier prevents double-claim, transfers to recipient, emits `("claimed", link_hash)` |
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

**Nullifier:** `sha256(link_hash)` stored in `temporary` storage. Checked before every claim.

**Phase 2 upgrade path:** Replace `secret: BytesN<32>` with `proof: Bytes`. Replace `sha256(secret) == link_hash` check with cross-contract call to `VerifierContract.verify_proof()`.

### `verifier-contract` — ZK Proof Verifier (Placeholder)

| Function | Signature | What it does |
|----------|-----------|-------------|
| `__constructor` | `(env, verification_key: Bytes)` | Stores VK in instance storage |
| `verify_proof` | `(env, public_inputs: Bytes, proof: Bytes) -> bool` | **PLACEHOLDER** — returns `true` for any non-empty proof. TODO: call native BN254 host functions for UltraHonk verification |
| `verification_key` | `(env) -> Bytes` | Returns stored VK |

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
| ZK (proving) | Barretenberg (bb.js 4.4.0) — deferred to Phase 2 |
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
        └── lib.rs                # Verifier placeholder (34 lines)
```

## License

MIT
