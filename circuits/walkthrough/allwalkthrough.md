# Circuits Walkthrough

## 1 — Noir Secret Proof Circuit

**File:** `circuits/src/policies/secret.nr` (35 lines)

ZK circuit that proves knowledge of a link secret without revealing it. Uses Pedersen hash (BN254 embedded curve ops).

```noir
pub fn verify(secret, recipient, link_hash, nullifier) {
    assert(pedersen_hash([secret]) == link_hash);
    assert(pedersen_hash([secret, recipient]) == nullifier);
}
```

**Public inputs (order matters):**
- `[0]` recipient — Stellar address as BN254 field element
- `[1]` link_hash — `pedersen_hash([secret])`
- `[2]` nullifier — `pedersen_hash([secret, recipient])`

**Private inputs:** `secret` — the link secret

**Tests:** `nargo test --show-output` → 2/2 pass (`test_main_happy_path`, `test_happy_path`)

## 2 — Entry Point

**File:** `circuits/src/main.nr` (19 lines)

```noir
fn main(secret: Field, recipient: pub Field, link_hash: pub Field, nullifier: pub Field) {
    policies::secret::verify(secret, recipient, link_hash, nullifier);
}
```

Delegates to `policies::secret::verify()`. Test uses `pedersen_hash` to compute reference values from `secret=42, recipient=123`.

## 3 — Hash Tool

**Directory:** `circuits/hash-tool/` (standalone Noir package)

Computes reference Pedersen hash values used in `Prover.toml`:

```
secret = "42", recipient = "123"
→ link_hash = 0x13b4df2bb5c6ef44590c1f54edb6eddd576d276e8043972f1ed0f3746b422925
→ nullifier = 0x0703a1b35910f85a0dbe265fcb79f0ff627b537b29fa711b13552226560eee68
```

## 4 — Current Status

**What works:**
- Circuit compiles via Docker: `docker compose run --rm compile`
- Tests pass via Docker: `docker compose run --rm test` — 2/2 pass
- Witness generation via Docker: `docker compose run --rm execute` → generates `target/secret.gz`
- bb.js Pedersen matches Noir at hashIndex=0 (verified via `verify-pedersen.mjs`)
- **Real UltraHonk proof generation works** (see Part 6 — was a version-pin bug, not a platform issue)
- `circuits/target/secret.json` fetched by browser at `/circuits/secret.json` (copied to `frontend/public/`)

**Limitations:**
- No nargo Windows binary — all nargo commands via Docker
- On-chain BN254 verification still not available (CAP-0074 proposed) — attestation-oracle pattern used

## 5 — Docker Setup

**Files:** `Dockerfile` (Node 20 + nargo 1.0.0-beta.22), `docker-compose.yml` (5 services)

| Service | Command | Purpose |
|---------|---------|---------|
| `dev` | `bash` | Interactive shell |
| `compile` | `nargo compile --force` | Compile circuits |
| `test` | `nargo test --show-output` | Run tests |
| `execute` | `nargo execute --force` | Generate witness |
| `prove` | `node scripts/prove-circuit.mjs` | Generate UltraHonk proof |

## 6 — E2E Integration (2026-07-02)

### Version-pin root cause (discovered)

The "bb.js crashes on all platforms" belief was wrong. The actual issue:

- **Frontend** had `@aztec/bb.js@^4.4.0` in `package.json`
- **Circuit** was compiled with Noir `1.0.0-beta.22`
- Noir `1.0.0-beta.22`'s own `install_bb.sh` pins Barretenberg to **`5.0.0-nightly.20260522`**
- Version `^4.4.0` is incompatible — crashes with this circuit's proof constraints

**Fix:** Pin exactly `@aztec/bb.js@5.0.0-nightly.20260522` in both frontend and backend.

**Proof confirmed working:**
```
Proof generated! Byte length: 14656
Public inputs: [recipientField, linkHashField, nullifierField]
Verified: true
```

### Upgrade path (future)

When CAP-0074 (BN254 host functions) ships on Stellar:
1. Implement an in-contract BN254 Groth16/UltraHonk verifier (or use native verify_proof once available)
2. Pass the verification key to `VerifierContract.__constructor` (already stored)
3. Replace the attestation-oracle flow with direct on-chain verification
4. Circuit code stays the same — already generates the correct proof format
5. Remove the backend attester dependency
