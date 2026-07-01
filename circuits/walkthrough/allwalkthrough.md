# Circuits Walkthrough

## 1 — Noir Secret Proof Circuit

**What:** ZK circuit proving knowledge of a link secret without revealing it. Uses Pedersen hash (BN254 embedded curve ops).

**`src/main.nr`:** Calls `policies::secret::verify()` with 4 params — `secret` (private), `recipient`, `link_hash`, `nullifier` (all public).

**`src/policies/secret.nr`:**
```noir
pub fn verify(secret, recipient, link_hash, nullifier) {
    assert(pedersen_hash([secret]) == link_hash);
    assert(pedersen_hash([secret, recipient]) == nullifier);
}
```

**Public input order (for on-chain):** `[recipient, link_hash, nullifier]`

**Tests pass:** `nargo test --show-output` → 2/2 pass.

**Files:** `circuits/src/main.nr`, `circuits/src/policies/secret.nr`, `circuits/src/policies/mod.nr`

## 2 — Hash Tool

Helper package (`circuits/hash-tool/`) that computes reference Pedersen hash values:
```noir
fn main(secret: 42, recipient: 123) -> [link_hash, nullifier]
```

Outputs: `link_hash = 0x13b4df2bb5c6ef44590c1f54edb6eddd576d276e8043972f1ed0f3746b422925`

**Files:** `circuits/hash-tool/src/main.nr`, `circuits/hash-tool/Prover.toml`

## 3 — MVP Status

Circuit compiles + executes via Docker (`docker compose run --rm compile`, `docker compose run --rm execute`). Proof generation via bb.js crashes on Windows (`RuntimeError: unreachable` in WASM). Phase 2: generate UltraHonk proof in Docker/Linux, verify via `VerifierContract`.
