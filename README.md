# ZK-PayLink

**ZK-PayLink** is a privacy-preserving, onboarding-free payment platform built on the Stellar network. Inspired by TipLink and SocketFi, it allows users to send and receive funds via shareable links, secured by Passkeys and Zero-Knowledge Proofs.

## 🚀 Vision

Reducing friction in Web3 payments by eliminating the need for recipients to have a wallet beforehand, while maintaining security and privacy through ZK technology.

## ✨ Features

- **Walletless Claiming**: Claim funds through a link without an initial wallet.
- **Passkey Auth**: Secure your link claims with biometric/hardware security.
- **ZK Privacy**: Prove you are the rightful claimant without revealing your identity or the specific link secret on-chain.
- **Stellar/Soroban**: High speed, low cost, and robust smart contract capabilities.

## 🏗️ Architecture

- **Frontend**: Next.js 15, Tailwind CSS, Stellar SDK, Noir Prover.
- **Smart Contracts**: Soroban (Rust) for escrow and proof verification.
- **ZK Circuits**: Noir for privacy-preserving claim logic.

## 📂 Project Structure

- `frontend/`: Next.js web application.
- `contracts/`: Soroban smart contracts.
- `circuits/`: Noir ZK circuits.
- `docs/`: Detailed architectural and project documentation.

## 🛠️ Getting Started

### Prerequisites

- [Rust & Cargo](https://rustup.rs/)
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)
- [Noir (Nargo)](https://noir-lang.org/docs/getting_started/installation)
- [Node.js & pnpm](https://nodejs.org/)

### Installation

1. Clone the repo
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build contracts:
   ```bash
   cd contracts && cargo build --target wasm32-unknown-unknown --release
   ```
4. Run frontend:
   ```bash
   cd frontend && npm run dev
   ```

## 📜 License

MIT
