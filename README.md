# Atreus

Atreus is a non-custodial, privacy-preserving payment infrastructure built on the Stellar network. It enables friction-free asset distribution via secure, shareable links that eliminate traditional Web3 onboarding barriers while maintaining absolute transactional privacy through Zero-Knowledge cryptography and hardware-bound Passkeys.

## Architecture Vision

Traditional crypto transactions demand that the recipient possesses a configured wallet before receiving funds, creating a massive drop-off layer in user onboarding. Atreus flips this paradigm by shifting the wallet-creation and key-management burden to an automated, decentralized escrow layer. By decoupling the initial asset transfer from immediate ledger addressing, funds can be securely routed via cryptographic links, ensuring institutional-grade security and consumer-grade simplicity.

## Core Capabilities

### Frictionless Settlement
Recipients can instantly interact with and claim incoming assets via unique access links without generating a traditional public-private keypair beforehand, removing onboarding friction entirely.

### Biometric Security Enforcement
Link custody and claim authorization are tightly integrated with hardware-backed WebAuthn credentials, utilizing on-device biometrics or security keys to safeguard claims against phishing and link-interception vectors.

### Zero-Knowledge Identity Shielding
Using custom Noir circuits, the platform generates mathematical proofs that validate the claimant is the rightful holder of the link secret. This cryptographic proof is verified on-chain without exposing the underlying secret or linking the recipient's identity back to the initial transaction.

### High-Throughput Execution Engine
Built natively on Soroban smart contracts, the settlement architecture ensures ultra-low execution overhead, predictable gas fee consumption, and rapid finality under heavy transaction batches.

## Technical Composition

### System Architecture
The application layout cleanly separates layout layers to maintain high modulatory and decoupling principles.

The user interface layer is driven by Next.js 15 and Tailwind CSS, integrating the core Stellar SDK for ledger communications and the Noir Prover runtime for localized client-side proof generation.

The on-chain consensus layer is governed by Soroban smart contracts written in Rust, orchestrating secure asset locking, deadline enforcement, and cryptographically verified balance releases.

The privacy enforcement layer utilizes specialized Noir circuits that compile logic pipelines into optimized proving keys, executing zero-knowledge validation natively on the client device.

The documentation repository contains exhaustive system design graphs, state-machine specs, and cryptographic safety audits.

# ZK-PayLink

ZK-PayLink is a non-custodial, privacy-preserving payment platform built on the Stellar network. It enables walletless asset distribution via secure, shareable links, maintaining absolute transactional privacy through Zero-Knowledge cryptography and hardware-bound Passkeys.

## Core Concepts

Traditional Web3 onboarding requires recipients to have a pre-configured wallet before receiving funds. ZK-PayLink removes this barrier by allowing users to claim assets directly through a cryptographic link. Claim authorization is secured by hardware-backed WebAuthn biometrics, while custom Noir ZK circuits generate proofs to validate the claimant on-chain without exposing the underlying link secret or recipient identity.

## Tech Stack

The frontend architecture is built on Next.js 15, Tailwind CSS, Stellar SDK, and the Noir Prover runtime for client-side proof generation. On-chain consensus and escrow logic are handled by Soroban smart contracts written in Rust, while the privacy layer is executed via Noir zero-knowledge circuits.

## Setup

Initialize the project dependencies from the root directory:
```bash
pnpm install
```
Compile the Soroban smart contracts into optimized WebAssembly bytecode:

Bash
```bash
cd contracts && cargo build --target wasm32-unknown-unknown --release
Launch the local frontend development server:
```
Bash
```bash
cd frontend && npm run dev
```
License
Distributed under the MIT License.
