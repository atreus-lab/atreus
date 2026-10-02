# Atreus Circuits

Noir circuits for privacy-preserving Stellar policies.

## Overview

This workspace contains Noir circuits used by Atreus contracts to verify zero-knowledge proofs for private DeFi gating.

## Policies

### policy_type == 0
Existing policy.

### policy_type == 1
Existing policy.

### balance_threshold (policy_type == 2) - Phase 2

Privacy-preserving minimum-balance proof.

Private inputs:
- `balance: Field` - actual balance in stroops
- `salt: Field` - random blinding factor

Public inputs:
- `threshold: Field` - minimum required balance
- `address_commitment: Field` - pedersen_hash([balance, salt])

Constraints:
1. `balance >= threshold` and both fit in u64 → proves balance >= threshold without overflow
2. `pedersen_hash([balance, salt]) == address_commitment` → binds to identity

Usage:
```bash
nargo compile
nargo test
```

Tests cover:
- balance == threshold → passes
- balance > threshold → passes
- balance < threshold → fails
