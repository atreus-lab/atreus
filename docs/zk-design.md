# ZK Design: ZK-PayLink

## Stage 1: Proof of Claim Authorization (Hackathon MVP)
The core ZK requirement is to prove that a claimant knows the `secret` associated with a `link_hash` without revealing the `secret` on the public ledger.

### Circuit Logic (Noir)
- **Private Input**: `secret` (a 256-bit random field element).
- **Public Input**: `link_hash` (the commitment stored on-chain).
- **Public Input**: `recipient_address` (to bind the proof to the claimant).
- **Constraint**: `PedersenHash(secret) == link_hash`.
- **Constraint**: The `recipient_address` must be included in the proof hash to prevent "Proof Sniping" (where a malicious actor intercepts a proof and tries to submit it with their own address).

### Double-Claim Prevention (Nullifiers)
To prevent the same link from being claimed twice, we use a `nullifier`.
- **Nullifier**: `Hash(secret, "CLAIMED")`.
- The contract stores used nullifiers. Since the nullifier is derived deterministically from the secret, the same secret will always produce the same nullifier.

## Stage 2: Ownership Proofs (Future)
Proving that the claimant is the "owner" of a specific digital identity or passkey without revealing which one.
- Integrate with a Merkle Tree of "Authorized Claimants".
- **Proof**: "I am one of the 100 people authorized to claim this grant, but I won't tell you which one."

## Stage 3: Compliance & Privacy Proofs
- **Identity Proofs**: Proving the claimant is over 18 or from a specific country (via zk-KYC) without revealing their passport details.
- **Confidential Transfers**: Obfuscating the *amount* being transferred, so only the sender and recipient know the value.

## Implementation Complexity & Tradeoffs
| Feature | Complexity | UX Impact | Gas/Proof Cost |
| :--- | :--- | :--- | :--- |
| **Secret Knowledge** | Low | Minimal | Low |
| **Passkey Integration** | Medium | High (Better security) | Medium |
| **Membership (Merkle)** | High | Minimal | High (Recursion needed) |
| **Confidential Amounts** | Very High | High (Wallet support needed) | Very High |

### Decision for MVP
We will prioritize **Secret Knowledge + Passkey Binding**. This provides the most "bang for buck" for the hackathon—demonstrating meaningful ZK usage while maintaining a smooth user experience and manageable development scope.
