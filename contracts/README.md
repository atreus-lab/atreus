# Atreus Contracts

Soroban smart contracts for the Atreus protocol on Stellar.

## Contracts

### AtreusContract — Core Escrow

| Function | What it does |
|----------|-------------|
| `__constructor(verifier: Address)` | Stores the verifier contract address in instance storage |
| `create_link(id, policy_type, policy_params, amount, asset, expiry, sender)` | Escrows tokens from sender, stores link info, emits `("created", id)` |
| `claim_link(link_hash, recipient, secret)` | Verifies `sha256(secret) == link_hash`, checks that `VerifierContract.is_attested(link_hash, recipient)` returns true, prevents double-claims via nullifier, transfers tokens to recipient |
| `refund_link(link_hash)` | Creator reclaims tokens after expiry |

**Data structures:**

```rust
pub struct LinkInfo {
    pub creator: Address,
    pub amount: i128,
    pub asset: Address,
    pub policy_type: u32,
    pub policy_params: Bytes,
    pub expires_at: u64,
    pub claimed: bool,
}
```

**Attestation gate:** `claim_link` calls `VerifierContract.is_attested(link_hash, recipient)` via cross-contract invocation and panics if false. This ensures that only claims backed by a verified ZK proof can succeed.

### VerifierContract — ZK Attestation Oracle

| Function | What it does |
|----------|-------------|
| `__constructor(verification_key, attester)` | Stores the verification key and trusted attester address |
| `attest(attester, link_hash, recipient)` | Requires the stored attester to authenticate. Records that a valid UltraHonk proof for this `(link_hash, recipient)` pair was verified off-chain. |
| `is_attested(link_hash, recipient) -> bool` | Read-only check used by `claim_link` to verify a proof was attested |
| `submit_proof(recipient, proof)` | Validates UltraHonk proof format and emits an event (logging function) |
| `verify_proof(public_inputs, proof) -> bool` | On-chain BN254 pairing verification — placeholder until Soroban adds native BN254 host functions (CAP-0074) |

## Tests

6 tests in `atreus-contract/src/test.rs`:

| Test | What it verifies |
|------|-----------------|
| `test_create_and_claim` | Happy path: create link → claim with correct secret |
| `test_wrong_secret_fails` | Wrong secret → claim returns error |
| `test_double_claim_fails` | Double-claim prevented by nullifier |
| `test_refund_after_expiry` | Creator reclaims after expiry |
| `test_claim_expired_fails` | Claim after expiry returns error |
| `test_email_restricted_claim` | Email-restricted policy enforcement |

```bash
cd contracts
cargo test -p atreus-contract    # 6 passed, 0 failed
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Blockchain | Stellar (Soroban) |
| Language | Rust |
| SDK | `soroban-sdk` 22.0.0 |
| Build target | `wasm32-unknown-unknown` |

## Getting Started

```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test -p atreus-contract

# Deploy (requires Stellar CLI + funded account)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/atreus_contract.wasm \
  --source-account <YOUR_KEY> \
  --network testnet
```

## Project Structure

```
contracts/
├── Cargo.toml                        # Workspace root
├── atreus-contract/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                    # Escrow contract logic
│       └── test.rs                   # Unit tests
└── verifier-contract/
    ├── Cargo.toml
    └── src/
        └── lib.rs                    # ZK attestation oracle
```

## Deployed Contracts (Testnet)

| Contract | ID |
|----------|-----|
| VerifierContract | `CDF7URS65R3N7BUAQMLQL5MRTUXZYCI3MUK3XXTBY4SGKONDAUXSTA2U` |
| AtreusContract | `CBHQCH7ENXKZXOTGHONWYMIPW4WWE6VHA6Y2SCEYEOIYQR53AUKE7ZSA` |

## License

MIT
