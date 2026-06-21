# Milestones: Atreus (2-Week Sprint)

## Week 1: Core Link Functionality
*Focus: Smart Contracts and Basic Frontend.*

- **D1-D2: Soroban Escrow**: Complete the `atreus-contract` with deposit and claim logic (initially without ZK).
- **D3-D4: Frontend Scaffolding**: Build the Next.js UI for creating and viewing links. Integrate Stellar SDK for payments.
- **D5: Passkey Prototype**: Implement basic WebAuthn registration and signature verification in the frontend.
- **D6-D7: Integration**: Connect the frontend to the Soroban contract on Testnet.

**Deliverables**: A functional (non-ZK) Atreus system where funds can be escrowed and claimed.
**Acceptance Criteria**: Sender can fund a link; recipient can claim it; transaction is visible on-chain.

## Week 2: Passkeys + Noir + Verifier
*Focus: ZK Privacy and Security Hardening.*

- **D8-D9: Noir Circuit**: Write the `main.nr` circuit for proof of secret knowledge. Implement Pedersen hashing and nullifiers.
- **D10-D11: Soroban Verifier**: Generate the Soroban-compatible verifier contract. Integrate it into the `atreus-contract`.
- **D12: Proving in Browser**: Integrate `@noir-lang/barretenberg` into the Next.js app. Generate proofs on the fly during the claim process.
- **D13: Polish & Testing**: UX refinements, error handling, and end-to-end testing on Testnet.
- **D14: Documentation & Submission**: Finalize `README`, record demo video, and submit to hackathon.

**Deliverables**: The complete Atreus platform.
**Acceptance Criteria**: Claiming a link results in a valid ZK-proof being verified on-chain; the `secret` never appears in the transaction history.

## Dependencies
- **Nargo (Noir CLI)**: For circuit compilation.
- **Stellar CLI**: For contract deployment.
- **Testnet Account**: With sufficient XLM for testing.
