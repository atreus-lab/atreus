# Atreus Circuits

Noir ZK circuits for the Atreus protocol. Proves knowledge of a link secret without revealing it.

## Circuit

`src/policies/secret.nr`:

```noir
pub fn verify(secret, recipient, link_hash, nullifier) {
    assert(pedersen_hash([secret]) == link_hash);
    assert(pedersen_hash([secret, recipient]) == nullifier);
}
```

**Public inputs** (order matters for proof verification):
- `[0]` recipient — Stellar address as BN254 field element
- `[1]` link_hash — `pedersen_hash([secret])`
- `[2]` nullifier — `pedersen_hash([secret, recipient])`

**Private inputs:**
- `secret` — the link secret (32-byte random value)

## Barretenberg Version

**Exact pin: `@aztec/bb.js@5.0.0-nightly.20260522`**

This matches the version Noir `1.0.0-beta.22`'s `install_bb.sh` pins to. The circuit generates 14,656-byte UltraHonk proofs.

## Pedersen Hash

`hashIndex=0` in `BarretenbergSync.pedersenHash()` matches Noir's `std::hash::pedersen_hash` bit-for-bit.

Reference values (secret=42, recipient=123):
- `link_hash = 0x13b4df2bb5c6ef44590c1f54edb6eddd576d276e8043972f1ed0f3746b422925`
- `nullifier  = 0x0703a1b35910f85a0dbe265fcb79f0ff627b537b29fa711b13552226560eee68`

## Tests

```bash
docker compose run --rm test

# Expected output:
# [secret] Testing test_main_happy_path... ok
# [secret] Testing policies::secret::test_happy_path... ok
```

## Docker Commands

```bash
docker compose run --rm compile    # nargo compile --force
docker compose run --rm test       # nargo test --show-output
docker compose run --rm execute    # nargo execute (generates witness)
```

## Hash Tool

`hash-tool/` is a standalone Noir package for computing reference Pedersen hash values.

## Project Structure

```
circuits/
├── Nargo.toml                  # Circuit package config
├── Prover.toml                 # Test inputs
├── Verifier.toml               # Public inputs for verification
├── target/
│   ├── secret.json             # Compiled circuit bytecode
│   └── secret.gz               # Witness for static test inputs
├── src/
│   ├── main.nr                 # Entry point
│   ├── policies/
│   │   ├── mod.nr
│   │   └── secret.nr           # Secret proof circuit
│   └── utils/
│       └── mod.nr
└── hash-tool/
    └── src/
        └── main.nr             # Pedersen hash computation tool
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Noir 1.0.0-beta.22 |
| Hash | Pedersen (BN254 embedded curve, hashIndex=0) |
| Proving | Barretenberg `@aztec/bb.js@5.0.0-nightly.20260522` |
| Proof system | UltraHonk |

## Integration

- **Backend** reads `circuits/target/secret.json` directly (monorepo-relative path)
- **Frontend** fetches `/circuits/secret.json` from `frontend/public/circuits/` (copied at build time)
- Both use the same field encoding: `BigInt('0x'+hex) % FR_ORDER` for all inputs

## License

MIT
