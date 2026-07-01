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

## 4 — MVP Status

**What works:**
- Circuit compiles via Docker: `docker compose run --rm compile`
- Tests pass via Docker: `docker compose run --rm test`
- Witness generation via Docker: `docker compose run --rm execute`
- bb.js Pedersen matches Noir at hashIndex=0 (verified via `verify-pedersen.mjs`)

**What's blocked:**
- bb.js UltraHonk proof generation crashes on Windows Node 20 (`RuntimeError: unreachable` inside WASM)
- No nargo Windows binary — all nargo commands via Docker

**Known issue:** `circuits/src/utils/mod.nr` declares `pub mod hash;` but `hash.nr` doesn't exist. Currently harmless (utils module not imported by main.nr) but needs fixing before use.

## 5 — Docker Setup

**Files:** `Dockerfile` (Node 20 + nargo 1.0.0-beta.22), `docker-compose.yml` (5 services)

| Service | Command | Purpose |
|---------|---------|---------|
| `dev` | `bash` | Interactive shell |
| `compile` | `nargo compile --force` | Compile circuits |
| `test` | `nargo test --show-output` | Run tests |
| `execute` | `nargo execute --force` | Generate witness |
| `prove` | `node scripts/prove-circuit.mjs` | Generate UltraHonk proof (crashes on Windows) |

## Upgrade Path (Phase 2)

1. Generate UltraHonk proof in Docker/Linux (bb.js works there)
2. Deploy VerifierContract with generated verification key
3. Replace SHA-256 check in AtreusContract with `VerifierContract.verify_proof()`
4. Circuit code stays the same — already uses Pedersen
