# Atreus Circuits

Noir ZK circuits for the Atreus protocol. Currently uses Pedersen hash (BN254 embedded curve ops). Ready for Phase 2 UltraHonk proof generation.

## Circuit: `policies/secret.nr`

Proves knowledge of a link secret without revealing it.

```noir
pub fn verify(secret, recipient, link_hash, nullifier) {
    assert(pedersen_hash([secret]) == link_hash);
    assert(pedersen_hash([secret, recipient]) == nullifier);
}
```

**Public inputs (order matters for on-chain verification):**
- `[0]` recipient — Stellar address as BN254 field element
- `[1]` link_hash — `pedersen_hash([secret])`
- `[2]` nullifier — `pedersen_hash([secret, recipient])`

**Private inputs:**
- `secret` — the link secret (32-byte random value)

## Tests

```bash
# Via Docker (no Windows binary for nargo)
docker compose run --rm test

# Expected output:
# [secret] Testing test_main_happy_path... ok
# [secret] Testing policies::secret::test_happy_path... ok
```

## Hash Tool

`hash-tool/` is a standalone Noir package that computes reference Pedersen hash values:

```noir
fn main(secret: 42, recipient: 123) -> [link_hash, nullifier]
```

**Reference values (from `Prover.toml`):**
- `link_hash = 0x13b4df2bb5c6ef44590c1f54edb6eddd576d276e8043972f1ed0f3746b422925`
- `nullifier = 0x0703a1b35910f85a0dbe265fcb79f0ff627b537b29fa711b13552226560eee68`

These values are used in the contract's `Prover.toml` for testing.

## Docker Commands

```bash
docker compose run --rm compile    # nargo compile --force
docker compose run --rm test       # nargo test --show-output
docker compose run --rm execute    # nargo execute --force (generates witness)
docker compose run --rm prove      # node scripts/prove-circuit.mjs (crashes on Windows)
```

## Known Issues

- **bb.js WASM crash:** `@aztec/bb.js` UltraHonkBackend crashes on Windows Node 20 with `RuntimeError: unreachable` inside WASM. Proof generation only works in Docker/Linux.
- **No nargo Windows binary:** Noir v1.0.0-beta.22 has no Windows build. All nargo commands must run via Docker.
- **SHA-256 vs Pedersen mismatch:** The contract uses SHA-256 for secret verification (MVP). The circuit uses Pedersen hash. These are NOT compatible — Phase 2 will replace SHA-256 with ZK proof verification.

## Project Structure

```
circuits/
├── Nargo.toml              # Circuit package config (name: "secret")
├── Prover.toml             # Test inputs (secret=42, recipient=123)
├── Verifier.toml           # Public inputs for verification
├── tool.nr                 # Standalone hash computation tool
├── src/
│   ├── main.nr             # Entry point — calls policies::secret::verify()
│   ├── policies/
│   │   ├── mod.nr          # Module declaration
│   │   └── secret.nr       # Secret proof circuit (Pedersen hash)
│   └── utils/
│       └── mod.nr          # Module declaration (empty — hash.nr not yet implemented)
└── hash-tool/
    ├── Nargo.toml           # Standalone package config
    ├── Prover.toml          # Test inputs
    └── src/
        └── main.nr          # Pedersen hash computation
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Noir 1.0.0-beta.22 |
| Hash | Pedersen (BN254 embedded curve) |
| Proving | Barretenberg (bb.js 4.4.0) — Phase 2 |
| Proof system | UltraHonk |

## License

MIT
