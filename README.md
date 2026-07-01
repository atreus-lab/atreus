# Atreus

> Privacy-preserving payment links on Stellar. No seed phrase required for recipients.

**TL;DR** — Sender creates a payment link with a secret. Recipient opens the link, proves knowledge of the secret, and receives funds. The secret never appears on-chain.

Built for [Stellar Hacks: Real-World ZK](https://dorahacks.io/hackathon/stellar-hacks-zk/detail).

## Current State (MVP)

The MVP uses **SHA-256** for secret verification (no ZK proofs yet). The ZK circuit (Noir/Pedersen) compiles and tests pass, but proof generation is blocked on Windows (`bb.js` WASM crash). Phase 2 will swap SHA-256 verification for UltraHonk proof verification.

| Component | Status | Notes |
|-----------|--------|-------|
| Contract: `create_link` | ✅ Working | Escrows tokens with SHA-256 link_hash |
| Contract: `claim_link` | ✅ Working | Verifies `sha256(secret) == link_hash` |
| Contract: `refund_link` | ✅ Working | Creator reclaims after expiry |
| Contract tests | ✅ 5/5 pass | `cargo test -p atreus-contract` |
| Noir circuit | ✅ Compiles + tests pass | Pedersen-based, ready for Phase 2 |
| Frontend: Create page | ✅ Working | Web Crypto SHA-256, Freighter signing |
| Frontend: Claim page | ✅ Working | Real Soroban tx via Freighter |
| Frontend build | ✅ Passes | `next build` succeeds |
| Backend API | ⏳ Stubs | Express server with mock endpoints |
| ZK proof generation | ❌ Blocked | bb.js WASM crashes on Windows Node 20 |
| VerifierContract | ⏳ Placeholder | Stores VK, `verify_proof()` is stub |

## Monorepo Structure

```
atreus/
├── frontend/          Next.js 15 web app (link create/claim)
├── backend/           Express API (stub — cut from MVP scope)
├── contracts/         Soroban smart contracts (Rust)
├── circuits/          Noir ZK circuits (Pedersen hash)
├── docs/              Architecture + design system
├── Dockerfile         Node 20 + nargo 1.0.0-beta.22
├── docker-compose.yml Docker services for nargo commands
├── package.json       Root pnpm workspace config
└── pnpm-workspace.yaml
```

**pnpm workspace** includes `frontend` and `backend` only. `contracts` and `circuits` are standalone (Rust/Noir).

## Getting Started

### Prerequisites

- Node.js >= 18
- [Rust + Cargo](https://rustup.rs/) (for contracts)
- [Docker](https://docker.com/) (for circuits — no Windows binary for nargo)
- [Freighter wallet](https://freighter.browser.com/) browser extension

### Install & Run

```bash
# Frontend + backend
pnpm install
pnpm dev                 # runs both in parallel
pnpm dev:frontend        # frontend only (localhost:3000)
pnpm dev:backend         # backend only (localhost:3001)

# Contracts (Rust)
cd contracts
cargo test -p atreus-contract                    # run tests
cargo build --target wasm32-unknown-unknown --release  # build WASM

# Circuits (Noir via Docker)
docker compose run --rm compile    # nargo compile
docker compose run --rm test       # nargo test
docker compose run --rm execute    # nargo execute (generates witness)
```

### Environment Variables

Copy `.env.example` to `.env.local` (frontend) or `.env` (backend):

```env
NEXT_PUBLIC_CONTRACT_ID=    # Soroban contract address (after deploy)
NEXT_PUBLIC_TOKEN_ID=       # XLM Stellar Asset Contract address on testnet
```

## Packages

| Package | Tech | What it does |
|---------|------|-------------|
| `frontend/` | Next.js 15, React 18, Tailwind CSS | Link create/claim UI, Freighter wallet integration |
| `backend/` | Express, TypeScript | REST API stubs (cut from MVP — frontend calls Soroban directly) |
| `contracts/` | Rust, Soroban SDK 22.0.0 | Escrow contract + VerifierContract placeholder |
| `circuits/` | Noir 1.0.0-beta.22 | Pedersen-based ZK proof circuit (Phase 2) |

## Contract API

```rust
// AtreusContract
create_link(id, policy_type, policy_params, amount, asset, expiry, sender)
claim_link(link_hash, recipient, secret)    // Phase 2: secret → proof
refund_link(link_hash)

// VerifierContract (placeholder)
verify_proof(public_inputs, proof) -> bool
verification_key() -> Bytes
```

## Claim Flow (Current MVP)

```
Sender                              Recipient
  │                                    │
  ├─ Generate 32-byte secret           │
  ├─ SHA-256(secret) → link_hash       │
  ├─ create_link(link_hash, amount)    │
  ├─ Share URL: /claim#<secret_hex>    │
  │                                    ├─ Open link
  │                                    ├─ Read #secretHex
  │                                    ├─ SHA-256(secret) → link_hash
  │                                    ├─ claim_link(link_hash, recipient, secret)
  │                                    └─ Funds transferred
```

**Phase 2 (ZK):** Secret stays private. Recipient generates UltraHonk proof that they know the secret without revealing it. Contract verifies proof via VerifierContract.

## Docs

- [Architecture](./docs/architecture.md) — System design, security model, roadmap
- [Design System](./docs/design.md) — UI tokens, colors, typography
- Walkthrough files in each package's `walkthrough/` directory

## License

MIT
