# Atreus Architecture

## 8.1 Threat Model

### 8.1.1 Native BN254 Verification (CAP-0074)
With the migration to Soroban SDK 26.1.0+, the attester oracle has been replaced with native on-chain BN254 proof verification via CAP-0074 host functions. This eliminates the trusted third party requirement and provides:

- **Trustless verification**: Proofs are verified directly on-chain using `env.crypto().bn254().pairing_check()`
- **No external dependencies**: No need for attester nodes or oracle services
- **Enhanced security**: Verification happens entirely within the Soroban execution environment

### 8.1.2 Replay Protection
The system maintains nullifier-based replay protection to prevent double-claiming:
- Each claim uses a unique nullifier
- Nullifiers are stored in persistent contract storage
- Reusing a nullifier results in a panic

### 8.1.3 Public Input Serialization
Public inputs are serialized as 32-byte big-endian field elements compatible with BN254:
- `recipient`: 32-byte recipient identifier
- `link_hash`: 32-byte link hash
- `nullifier`: 32-byte nullifier

All inputs are padded to exactly 32 bytes to match Bn254Fr field element size.
