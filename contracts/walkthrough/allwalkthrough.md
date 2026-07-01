# Contracts Walkthrough

## 1 — Hash API Audit → Pedersen → SHA256 Pivot

**What:** Audited Noir stdlib hash APIs. `std::hash::poseidon::bn254::hash_*` never shipped. Two pivots:
- Poseidon → Pedersen (circuit uses `pedersen_hash`)
- Pedersen → SHA256 (MVP uses `env.crypto().sha256()` + Web Crypto API; bb.js WASM crashes on Windows)

**Files:** `contracts/atreus-contract/src/lib.rs`, `circuits/src/policies/secret.nr`

## 2 — AtreusContract Design

**What:** Core escrow contract with 3 entry points.

| Function | What it does |
|----------|-------------|
| `create_link` | Creator escrows tokens + `link_hash` + policy + expiry |
| `claim_link` | Recipient submits `secret: BytesN<32>`, contract checks `sha256(secret) == link_hash`. Phase 2: replace secret param with `proof`, swap sha256 check for `VerifierContract.verify_proof()` |
| `refund_link` | Creator reclaims after expiry |

**Nullifier:** `sha256(link_hash_bytes)` prevents double-claim.

**Tests:** 5 tests using `client.try_claim_link()` (Soroban's built-in `try_` variant — no `catch_unwind` needed).

```bash
cd contracts && cargo test -p atreus-contract
# 5 passed, 0 failed
```

**Files:** `contracts/atreus-contract/src/lib.rs`, `test.rs`

## 3 — Docker Dev Environment

**Why:** Noir v1.0.0-beta.22 has no Windows binary.

**Services:** `dev` (bash), `compile` (nargo compile), `test` (nargo test), `execute` (nargo execute), `prove` (node scripts/prove-circuit.mjs).

**Known issue:** bb.js WASM crashes on Windows Node 20 (`RuntimeError: unreachable`). Proof gen deferred to Phase 2.

**Files:** `Dockerfile`, `docker-compose.yml`

## 4 — VerifierContract (Placeholder)

Stores a verification key, has `verify_proof()` stub. Not used in MVP — ready for Phase 2 ZK upgrade.

**Files:** `contracts/verifier-contract/src/lib.rs`
