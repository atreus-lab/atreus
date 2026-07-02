# Atreus Circuits

Noir ZK circuits for the Atreus protocol. Proves knowledge of a link secret without revealing it.

## Circuit: `policies/secret.nr`

```noir
pub fn verify(secret, recipient, link_hash, nullifier) {
    assert(pedersen_hash([secret]) == link_hash);
    assert(pedersen_hash([secret, recipient]) == nullifier);
}
```

**Public inputs (order matters for proof verification):**
- `[0]` recipient — Stellar address as BN254 field element
- `[1]` link_hash — `pedersen_hash([secret])`
- `[2]` nullifier — `pedersen_hash([secret, recipient])`

**Private inputs:**
- `secret` — the link secret (32-byte random value)

## bb.js Version

**Exact pin: `@aztec/bb.js@5.0.0-nightly.20260522`**

This matches what Noir `1.0.0-beta.22`'s own `install_bb.sh` pins Barretenberg to.
Using any other version causes proof generation to fail. The circuit generates real
14,656-byte UltraHonk proofs. See `walkthrough/allwalkthrough.md` Part 9 for the
discovery of the version-mismatch root cause.

## Pedersen Hash Compatibility

`hashIndex=0` in bb.js's `BarretenbergSync.pedersenHash()` matches Noir's
`std::hash::pedersen_hash` bit-for-bit — verified by `frontend/scripts/verify-pedersen.mjs`.

Reference values (secret=42, recipient=123):
- `link_hash = 0x13b4df2bb5c6ef44590c1f54edb6eddd576d276e8043972f1ed0f3746b422925`
- `nullifier  = 0x0703a1b35910f85a0dbe265fcb79f0ff627b537b29fa711b13552226560eee68`

## Tests

```bash
# Via Docker (no Windows binary for nargo)
docker compose run --rm test

# Expected output:
# [secret] Testing test_main_happy_path... ok
# [secret] Testing policies::secret::test_happy_path... ok
```

## Docker Commands

```bash
docker compose run --rm compile    # nargo compile --force
docker compose run --rm test       # nargo test --show-output
docker compose run --rm execute    # nargo execute --force (generates witness)
```

## Hash Tool

`hash-tool/` is a standalone Noir package that computes reference Pedersen hash values:

```noir
fn main(secret: 42, recipient: 123) -> [link_hash, nullifier]
```

## Project Structure

```
circuits/
├── Nargo.toml              # Circuit package config (name: "secret")
├── Prover.toml             # Test inputs (secret=42, recipient=123)
├── Verifier.toml           # Public inputs for verification
├── target/
│   ├── secret.json         # Compiled circuit bytecode (loaded by Node + browser)
│   └── secret.gz           # Witness for static test inputs
├── src/
│   ├── main.nr             # Entry point — calls policies::secret::verify()
│   ├── policies/
│   │   ├── mod.nr          # Module declaration
│   │   └── secret.nr       # Secret proof circuit (Pedersen hash)
│   └── utils/
│       └── mod.nr          # Module declaration
└── hash-tool/
    ├── Nargo.toml
    ├── Prover.toml
    └── src/
        └── main.nr          # Pedersen hash computation tool
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Noir 1.0.0-beta.22 |
| Hash | Pedersen (BN254 embedded curve, hashIndex=0) |
| Proving | Barretenberg `@aztec/bb.js@5.0.0-nightly.20260522` (exact) |
| Proof system | UltraHonk |

## Integration

- **Backend** reads `circuits/target/secret.json` directly (monorepo-relative path)
- **Frontend** fetches `/circuits/secret.json` from `frontend/public/circuits/` (copied there at build time)
- Both use the same field encoding: `BigInt('0x'+hex) % FR_ORDER` for all inputs

## License

MIT
