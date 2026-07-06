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

## 4 — VerifierContract (Proof Receipt Service)

**File:** `contracts/verifier-contract/src/lib.rs` (57 lines)

**Functions:**
- `__constructor(verification_key)` — stores VK for future verification
- `submit_proof(recipient, proof)` — validates 2144-byte proof length, emits `("proof", recipient)` event
- `verify_proof(public_inputs, proof)` — placeholder, returns `!proof.is_empty()`
- `verification_key()` — returns stored VK

**See Section 6 below** for the architecture decision behind the proof receipt service pattern.

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

**New function:**
- `submit_proof(recipient, proof)` — validates proof is exactly 2144 bytes (UltraHonk standard size), emits `("proof", recipient)` event with proof length
- `verify_proof(public_inputs, proof)` — unchanged placeholder, returns `!proof.is_empty()`
- Constructor stores `verification_key` (maintained for future compatibility)

## 7 — Testnet Deployment

**Date:** 2026-07-02
**Status:** ✅ Both contracts deployed and responsive via Soroban RPC

| Contract | ID |
|---|---|
| VerifierContract | `CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB` |
| AtreusContract | `CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2` |

**Constructor args:** AtreusContract receives `verifier: CA3WA53L...` — cross-contract call architecture is wired.

**Env vars in frontend:**
```env
NEXT_PUBLIC_CONTRACT_ID=CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB
NEXT_PUBLIC_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

**Deployer key:** `atreus-deployer` (testnet, funded via friendbot)

## 8 — Known Limitations (superseded — see Part 9)

- ~~`bb.js` UltraHonk `generateProof()` crashes on ALL platforms (Windows + Docker/Linux) with Pedersen hash circuits — not just a Windows issue~~ **Wrong diagnosis, fixed — see Part 9.1.**
- ~~Mock proof (2144 random bytes) used in frontend instead of real proof.~~ **Superseded — real proof generation now works.**
- Soroban SDK 22.0.0 lacks BN254 precompiles (ecAdd, ecMul, ecPairing) — on-chain UltraHonk verification impossible until CAP-0074 ships. **This part was correct** — see Part 9.2 for what we actually did about it.
- Docker `prove` service still needs the version pin from 9.1 applied before it'll work — not yet re-tested in Docker (only tested natively via `node scripts/prove-circuit-test.mjs` on Windows).

## 9 — The bb.js Crash Was a Version Mismatch, Not a Platform Bug

**Date:** 2026-07-02

**What we believed:** `bb.js` UltraHonk proof generation was fundamentally broken — crashed with
`RuntimeError: unreachable` on every platform tried (Windows native, Docker/Linux), for weeks. Conclusion
at the time: ZK proving was a dead end, strip it out (Option A: SHA-256-only escrow,
keep the verifier contract as inert evidence of the design).

### 9.1 — Root cause: wrong `@aztec/bb.js` version

`frontend/package.json` had `"@aztec/bb.js": "^4.4.0"`. The circuit was compiled with Noir
`1.0.0-beta.22`. Noir's own release process pins a specific Barretenberg build per compiler version —
`v1.0.0-beta.22`'s `scripts/install_bb.sh` on GitHub pins `5.0.0-nightly.20260522`, a completely different
major version than what was installed. Wrong bytecode/WASM-ABI expectations between the compiled circuit
and the installed prover is exactly what produces a WASM `unreachable` trap — not a disk/memory/platform
issue. (We first suspected disk space on a nearly-full `C:` drive; ruled out — same crash occurs on a
drive with 80GB free.) Also ruled out: Node.js worker-thread initialization (a documented cause of similar
`unreachable` errors) — same crash with `Barretenberg.initSingleton({ threads: 1, backend: "Wasm" })`.

**Fix:** pin `@aztec/bb.js` to the exact version `5.0.0-nightly.20260522` in both `frontend/package.json`
and `backend/package.json` (`pnpm --filter <pkg> add @aztec/bb.js@5.0.0-nightly.20260522`).

**Result:** `UltraHonkBackend.generateProof()` and `.verifyProof()` now work — tested via
`frontend/scripts/prove-circuit-test.mjs`: real 14,656-byte UltraHonk proof generated and verified
against the existing compiled circuit (`circuits/target/secret.json` / `secret.gz`).

### 9.2 — On-chain verification is still genuinely unavailable — attestation oracle instead

The "Soroban SDK lacks BN254 precompiles" limitation was correctly diagnosed the first time — confirmed
against Stellar's own capability matrix (BLS12-381 pairing checks are live per CAP-0059; BN254, which
Noir/Barretenberg targets, is CAP-0074, still proposed, not implemented). No SDK version fixes this — it's
a protocol capability gap, not a library bug.

Rather than stripping ZK out entirely (the original "Option A" plan), we implemented Stellar's own
recommended interim pattern for Noir circuits: the **attestation oracle**. Real proof generated
client-side → verified off-chain by a trusted, documented attester service (`backend/`) → attester submits
a signed on-chain attestation → `claim_link` requires that attestation before releasing funds. See
`contracts/README.md`'s verifier-contract section for the full mechanics and the explicit trust-assumption
writeup (single attester = single point of failure, by design, pending CAP-0074).

**Contract changes:**
- `verifier-contract`: constructor now also takes a trusted `attester: Address`. Added `attest()` and
  `is_attested()`. `verify_proof()` kept as-is with an updated, accurate doc comment (not deleted — still
  evidence the on-chain-verification path was designed, just not the active gate).
- `atreus-contract`: `claim_link` now also requires `VerifierContract.is_attested(link_hash, recipient) ==
  true`, via cross-contract call (`env.invoke_contract`), in addition to the unchanged `sha256(secret) ==
  link_hash` check. `create_link` and `refund_link` are untouched.
- Confirmed via existing code review (not assumed): `claim_link`'s replay protection (the `claimed` flag
  + its own `sha256(link_hash)`-based nullifier) was already independent of the ZK circuit's own
  Pedersen-domain nullifier, which only binds the proof to a specific recipient (anti-sniping) — so no
  extra nullifier storage was needed in the verifier contract.

### 9.3 — Redeployment

Both contracts rebuilt and redeployed to testnet (old IDs from Part 7 are now orphaned — no funds were
locked in them beyond this session's own test data):

| Contract | New ID |
|---|---|
| VerifierContract | `CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD` |
| AtreusContract | `CCZSFPZ6XPZBUPBGQ5FRP5BMW5HKZIZNCWPLJAHNOWP4ZI7BZSMJDTCD` |

Verifier constructor args: `verification_key` = 34 zero bytes (unchanged placeholder — `verify_proof` was
already a placeholder and isn't the active gate), `attester` = a freshly generated, friendbot-funded
testnet keypair (secret held in gitignored `backend/.env`, never committed).

Sanity check post-deploy: `is_attested(<any link_hash>, <any recipient>)` correctly returns `false` by
default (no attestation exists yet) — confirms the gate defaults closed, not open.

## Part 10 — Backend + Frontend E2E Verified (2026-07-02)

### 10.1 — Backend smoke test (B6)

Script: `backend/scripts/test-attestation.mjs`

Full pipeline executed successfully:

1. Random 32-byte secret → `sha256` link_hash
2. Random Stellar recipient (`Keypair.random()`)
3. Field encoding: `secretToField`, `addressToField` (BigInt mod FR_ORDER)
4. `BarretenbergSync.pedersenHash(hashIndex=0)` → `linkHashField`, `nullifierField`
5. `Noir.execute({ secret, recipient, link_hash, nullifier })` → 404-byte witness
6. `UltraHonkBackend.generateProof(witness)` → **14,656-byte proof**
7. Local `backend.verifyProof(result)` → **true**
8. POST to `/api/links/:hash/attest` → **`{ success: true, attestationTx: "83df8a66..." }`**
9. `stellar contract invoke ... is_attested` → **`true`**

Two fixes required during this step:
- Added `--env-file=.env` to backend `dev` script (Node wasn't loading `.env`)
- Bumped `@stellar/stellar-sdk` from `^12.1.0` to `^16.0.1` (`Bad union switch: 4` XDR parse error from v12 with current testnet protocol)

### 10.2 — Frontend ZK integration (B7)

`frontend/src/lib/zk.ts` created — mirrors the Node proof-gen pipeline, adapted for browser:
- Dynamic imports for `@aztec/bb.js` and `@noir-lang/noir_js` (deferred WASM load)
- `BigInt()` constructor instead of `n` suffix (tsconfig target ES2017)
- Circuit loaded from `/circuits/secret.json` (copied to `frontend/public/circuits/`)
- `generateClaimProof(secretBytes, recipient)` → `{ proof, linkHashHex }`
- `requestAttestation(...)` → POST to backend

`frontend/src/app/claim/page.tsx` rewritten:
- Real statuses: `generating_proof` → `attesting` → `claiming` → `success`
- `MOCK_ULTRAHONK_PROOF` removed entirely
- `submitProofTx` removed from `stellar.ts` (attestation-oracle replaces it)
- Balance check added to `createEscrowTx`; funded-account check added to `claimLinkTx`

Frontend build verified clean: `npx next build` — all 12 routes, 0 TS errors.
