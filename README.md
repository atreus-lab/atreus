# Atreus Contracts

Soroban smart contracts for the Atreus protocol on Stellar — escrow, claim, and zero-knowledge proof verification.

## Contracts

### `atreus-contract`

Core escrow contract. Handles:

- **`create_link`** — Creator escrows funds (token + amount) keyed by a `link_hash`
- **`claim_link`** — Recipient presents a ZK proof to claim escrowed funds

### `verifier-contract`

ZK proof verification contract. Handles:

- **`verify_proof`** — Takes a verification key, proof, and public inputs; returns `true`/`false`

## Tech Stack

| Layer | Choice |
|-------|--------|
| Blockchain | Stellar (Soroban) |
| Language | Rust |
| SDK | `soroban-sdk` |
| ZK | Noir (UltraPlonk) |
| Build | Cargo + `wasm32-unknown-unknown` |

## Getting Started

### Prerequisites

- [Rust & Cargo](https://rustup.rs/)
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)
- [Noir (Nargo)](https://noir-lang.org/docs/getting_started/installation)

### Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

### Test

```bash
cargo test
```

### Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/atreus_contract.wasm \
  --source-account <YOUR_KEY> \
  --network testnet
```

## Project Structure

```
contracts/
├── Cargo.toml              # Workspace root
├── atreus-contract/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs          # Contract logic
│       └── test.rs         # Unit tests
└── verifier-contract/
    ├── Cargo.toml
    └── src/
        └── lib.rs          # ZK verification logic
```

## License

MIT
