# Roadmap: Atreus

## Phase 1: Private Links (Hackathon MVP)
- **Goal**: Functional proof-of-concept for private link claiming.
- **Features**: ZK-Proof of knowledge for claim authorization, Passkey integration, Soroban escrow.
- **Technical Requirements**: Noir circuits, Soroban verifier, Next.js frontend.
- **Success Metrics**: Successfully claimed links on Testnet without revealing secrets on-chain.

## Phase 2: Wallet Abstraction
- **Goal**: Remove the "wallet" concept for the recipient entirely.
- **Features**: Automatic ephemeral account creation, session keys, fee-delegation (gasless claims).
- **Technical Requirements**: Stellar Protocol 25/26 features, account abstraction patterns.
- **Success Metrics**: User claims funds and can send them elsewhere without owning XLM for fees.

## Phase 3: Claim Authorization Proofs (CAPs)
- **Goal**: Enhanced security and identity binding.
- **Features**: Proving identity (via OIDC or social) within the ZK proof, multi-factor link claiming.
- **Technical Requirements**: Integration with identity providers, advanced Noir recursion.
- **Success Metrics**: Secure claim restricted to a specific email/phone without revealing that identity on-chain.

## Phase 4: Private Payroll
- **Goal**: Enterprise-grade distribution.
- **Features**: Bulk link generation, CSV imports, privacy-preserving reporting for employers.
- **Technical Requirements**: Batch proof generation, server-side ZK-acceleration.
- **Success Metrics**: First pilot with a small organization distributing wages via Atreus Links.

## Phase 5: Private Treasury Distribution
- **Goal**: DAO and Treasury integration.
- **Features**: Multi-sig link creation, governance-gated distributions.
- **Technical Requirements**: Soroban multi-sig patterns, bridge to popular treasury tools.
- **Success Metrics**: A Stellar DAO uses Atreus for anonymous contributor rewards.

## Phase 6: Developer Platform
- **Goal**: Ecosystem-wide adoption.
- **Features**: Atreus SDK, API for link creation, Whitelabel frontend components.
- **Technical Requirements**: Documentation, stable TS/Rust SDKs.
- **Success Metrics**: 5+ external projects integrating Atreus for their distribution needs.
