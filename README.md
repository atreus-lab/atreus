# Atreus

> Privacy-preserving payment links + full-featured Stellar wallet. Built for [Stellar Hacks: Real-World ZK](https://dorahacks.io/hackathon/stellar-hacks-zk/detail).

## What It Does

- **Wallet Dashboard** — View balance, all assets, recent transactions. Create wallet instantly (no extension needed).
- **Send / Receive** — Send XLM to any Stellar address. Receive with copy-address + explorer link.
- **Swap** — XLM → USDC/EURT via Stellar DEX path payments. Auto-adds trustlines.
- **Payment Links** — Create escrow links with SHA-256 secret. Recipient claims with ZK proof architecture demo.
- **Manage Assets** — Add trustlines for any Stellar asset (USDC, EURT, custom).

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Wallet dashboard | ✅ Working | localStorage keypair, Horizon API |
| Send XLM | ✅ Working | Web wallet signing via stellar-sdk |
| Receive | ✅ Working | Copy address, explorer link |
| Swap (XLM → USDC/EURT) | ✅ Working | DEX path payment, auto-trustline |
| Manage Assets (trustlines) | ✅ Working | Add USDC, EURT, or custom assets |
| Create payment link | ✅ Working | Freighter + Soroban contract call |
| Claim payment link | ✅ Working | ZK proof receipt + SHA-256 fallback |
| VerifierContract | ✅ Deployed | Proof receipt service (testnet) |
| AtreusContract | ✅ Deployed | Escrow + claim (testnet) |
| Noir circuit | ⏳ Compiles + tests pass | Pedersen hash — proof gen blocked |
| bb.js UltraHonk proof | ❌ Blocked | Crashes on ALL platforms with Pedersen |
| Backend API | ❌ Cut from MVP | Frontend calls Soroban directly |

## Monorepo Structure

```
atreus/
├── frontend/          Next.js 15 web app (wallet + payment links)
├── backend/           Express API (cut from MVP scope)
├── contracts/         Soroban smart contracts (Rust)
├── circuits/          Noir ZK circuits (Pedersen hash)
├── docs/              Architecture + design system (stale)
├── Dockerfile         Node 20 + nargo 1.0.0-beta.22
├── docker-compose.yml Docker services for nargo commands
├── package.json       Root pnpm workspace config
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js >= 18
- [Rust + Cargo](https://rustup.rs/) (for contracts)
- [Docker](https://docker.com/) (for circuits — no Windows nargo binary)
- [Freighter wallet](https://freighter.browser.com/) (optional — only for create/claim pages)

### Quick Start

```bash
# Frontend only
cd frontend
npm install
cp .env.example .env.local   # edit with your values
npm run dev                   # http://localhost:3000
```

### All Commands

```bash
# Frontend
cd frontend
npm install
npm run dev            # dev server on :3000
npm run build          # production build

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

```env
NEXT_PUBLIC_CONTRACT_ID=CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB
NEXT_PUBLIC_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

## Pages

| Route | Feature | Auth |
|-------|---------|------|
| `/` | Landing page | None |
| `/wallet` | Create/manage wallet | localStorage |
| `/dashboard` | Balance, assets, actions, tx history | localStorage |
| `/send` | Send XLM | localStorage |
| `/receive` | Receive — copy address | localStorage |
| `/swap` | XLM → token via Stellar DEX | localStorage |
| `/assets` | Add trustlines (USDC, EURT, custom) | localStorage |
| `/create` | Create payment link (Freighter) | Freighter |
| `/claim` | Claim payment link (Freighter) | Freighter |

## Architecture

### Web Wallet (No Extension Needed)

- `wallet.ts`: `Keypair.random()` → localStorage → `tx.sign(kp)` → `rpcServer.sendTransaction()`
- Friendbot funding via `https://friendbot.stellar.org`
- All wallet pages (dashboard, send, receive, swap, assets) work without Freighter

### Payment Links

1. **Sender**: Generates 32-byte secret → SHA-256 → `create_link(id, 0, empty, amount, asset, expiry, sender)` → contract escrows tokens
2. **Recipient**: Opens URL with `#secretHex` → submits mock ZK proof to VerifierContract → calls `claim_link(linkHash, recipient, secret)` → SHA-256 verified → tokens released

### ZK Architecture (Demo)

- Noir circuit compiles + tests pass (`nargo test`)
- bb.js UltraHonk proof generation BLOCKED on ALL platforms (native backend crash with Pedersen)
- VerifierContract deployed as proof receipt service: `submit_proof()` validates 2144-byte format, emits event
- SHA-256 fallback releases funds in current MVP
- Architecture ready for Soroban Protocol 25/26 BN254 precompiles

## Deployed Contracts (Testnet)

| Contract | ID |
|----------|-----|
| VerifierContract | `CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB` |
| AtreusContract | `CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2` |

## Packages

| Package | Tech | What it does |
|---------|------|-------------|
| `frontend/` | Next.js 15, React 19, Tailwind CSS | Wallet + payment links UI |
| `backend/` | Express, TypeScript | REST API stubs (cut from MVP) |
| `contracts/` | Rust, Soroban SDK 22.0.0 | Escrow contract + VerifierContract |
| `circuits/` | Noir 1.0.0-beta.22 | Pedersen-based ZK proof circuit |

## Known Issues

- bb.js UltraHonk crashes on ALL platforms (Windows + Docker/Linux) — proof gen deferred
- Soroban SDK 22.0.0 lacks BN254 precompiles — on-chain UltraHonk verification impossible
- `/docs/architecture.md` and `/docs/design.md` are stale
- Testnet has limited DEX liquidity — swap may fail for some token pairs
- Create/claim pages require Freighter (wallet pages don't)

## Docs

- Walkthrough files in each package's `walkthrough/` directory
- [Frontend Walkthrough](./frontend/walkthrough/allwalkthrough.md)
- [Contracts Walkthrough](./contracts/walkthrough/allwalkthrough.md)
- [Circuits Walkthrough](./circuits/walkthrough/allwalkthrough.md)

## License

MIT
