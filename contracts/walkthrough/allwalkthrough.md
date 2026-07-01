# Contracts Walkthrough

## 1 — Hash API Audit & Pivot

**Problem:** Architecture doc referenced `std::hash::poseidon::bn254::hash_*` which **never shipped** in any Noir version.

**Discovery:** Audited Noir stdlib. Real APIs are `pedersen_hash`, `poseidon2_permutation`, `sha256_compression`. Poseidon (JS lib) ≠ Poseidon2 (Noir) — different round constants, different outputs for same inputs.

**Decision chain:**
1. Poseidon → Pedersen (circuit uses `pedersen_hash`)
2. Pedersen → SHA256 (contract uses `env.crypto().sha256()` because bb.js WASM crashes on Windows)

## 2 — AtreusContract Implementation

**File:** `contracts/atreus-contract/src/lib.rs` (137 lines)

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
```

**Entry points:**
- `create_link(id, policy_type, policy_params, amount, asset, expiry, sender)` — requires sender auth, transfers tokens to contract (escrow), stores LinkInfo in persistent storage
- `claim_link(link_hash, recipient, secret)` — requires recipient auth, verifies `sha256(secret) == link_hash`, checks not claimed/expired, nullifier = `sha256(link_hash)` stored in temporary storage, transfers to recipient
- `refund_link(link_hash)` — requires creator auth, checks not claimed + expired, transfers back to creator, removes from storage

**Events:** `("created", id)`, `("claimed", link_hash)`, `("refunded", link_hash)`

## 3 — Test Suite

**File:** `contracts/atreus-contract/src/test.rs` (119 lines)

5 tests using `client.try_claim_link()` pattern (Soroban SDK's `try_` variant — no `catch_unwind` needed):

| Test | Lines | What it verifies |
|------|-------|-----------------|
| `test_create_and_claim` | 31-46 | Happy path: create → claim with correct secret |
| `test_wrong_secret_fails` | 48-63 | Wrong secret → `Err` |
| `test_double_claim_fails` | 65-83 | Second claim → `Err` |
| `test_refund_after_expiry` | 85-100 | Refund after expiry succeeds |
| `test_claim_expired_fails` | 102-119 | Claim after expiry → `Err` |

Helper `make_secret(env, val)` creates `(secret: BytesN<32>, link_hash: BytesN<32>)` using `sha256`.

## 4 — VerifierContract (Placeholder)

**File:** `contracts/verifier-contract/src/lib.rs` (34 lines)

Stores verification key. `verify_proof()` returns `true` for any non-empty proof — actual BN254 verification is a TODO for Phase 2.

## 5 — Docker Dev Environment

**Files:** `Dockerfile`, `docker-compose.yml`

Node 20 + nargo 1.0.0-beta.22. 5 services: `dev` (bash), `compile`, `test`, `execute`, `prove`.

Known issue: `prove` service (bb.js UltraHonk) crashes on Windows with `RuntimeError: unreachable` inside WASM.

## Upgrade Path

1. Replace `secret: BytesN<32>` param with `proof: Bytes`
2. Replace `sha256(secret) == link_hash` with `VerifierContract.verify_proof()`
3. Circuit already uses Pedersen — just need to generate + verify UltraHonk proofs
4. Once Soroban Protocol 25/26 ships BN254 precompiles, update `verify_proof()` to call `env.crypto().bn254_*()`

## 6 — VerifierContract Refactor: ZK Proof Receipt Service

**Date:** 2026-07-01
**Reason:** Soroban SDK 22.0.0 doesn't expose BN254 precompiles (ecAdd, ecMul, ecPairing). UltraHonk proof verification is mathematically impossible on-chain until Protocol 25/26.

**Architecture decision:** VerifierContract becomes a proof receipt service instead of a cryptographic verifier.

**File:** `contracts/verifier-contract/src/lib.rs` (53 lines)

**New function:**
- `submit_proof(recipient, proof)` — validates proof is exactly 2144 bytes (UltraHonk standard size), emits `("proof", recipient)` event with proof length
- `verify_proof(public_inputs, proof)` — unchanged placeholder, returns `!proof.is_empty()`
- Constructor stores `verification_key` (maintained for future compatibility)

## 7 — Testnet Deployment

**Date:** 2026-07-02

| Contract | ID | 
|---|---|
| VerifierContract | `CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB` |
| AtreusContract | `CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2` |

**Deployer key:** `atreus-deployer` (testnet, funded via friendbot)

**Constructor args:** AtreusContract receives `verifier: CA3WA53L...` — cross-contract call architecture is wired.

## 8 — Known Limitations

- `bb.js` UltraHonk `generateProof()` crashes on Windows Node 20 (`RuntimeError: unreachable` in WASM). Also crashes in Docker/Linux with Pedersen hash circuits.
- Mock proof (2144 random bytes) used in frontend instead of real proof. `nargo test` passes (circuit logic correct).
- Sorobon Protocol 25/26 BN254 precompiles not yet available — on-chain verification deferred.
- Docker `prove` service fails due to native backend process crash in bb.js.
