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
| Wallet dashboard | ✅ Working | BIP39 mnemonic wallet, Horizon API |
| Send XLM | ✅ Working | Web wallet signing via stellar-sdk |
| Receive | ✅ Working | Copy address, explorer link |
| Swap (XLM → USDC/EURT) | ✅ Working | DEX path payment, auto-trustline |
| Manage Assets (trustlines) | ✅ Working | Add USDC, EURT, or custom assets |
| Google OAuth sign-in | ✅ Working | Sign in with Google, email stored in wallet |
| Wallet restore (seed phrase) | ✅ Working | BIP39 mnemonic validation + recovery |
| Create payment link | Needs test | localStorage wallet + Soroban contract call |
| Claim payment link | ✅ Working | Real ZK proof (client-side UltraHonk) → backend attestation → on-chain `claim_link` gated on `is_attested` |
| VerifierContract | ✅ Deployed (redeployed) | Real attestation oracle (`attest`/`is_attested`), not just a receipt service — testnet |
| AtreusContract | ✅ Deployed (redeployed) | Escrow + claim, now gated on ZK attestation — testnet |
| Noir circuit | ✅ Compiles + tests pass | Pedersen hash |
| bb.js UltraHonk proof | ✅ Working | Was a `bb.js` version-pin bug (`^4.4.0` vs the `5.0.0-nightly.20260522` Noir `1.0.0-beta.22` actually needs), not a platform/architecture limitation — see [contracts walkthrough Part 9](./contracts/walkthrough/allwalkthrough.md) |
| Backend API | ✅ Working | ZK attestation-oracle: verifies real proofs off-chain, signs on-chain attestations |

## Key Features

### Web Wallet (No Extension Needed)
- **BIP39 mnemonic** (24 words) instead of `Keypair.random()` — recoverable across devices
- **Google OAuth** sign-in via `@react-oauth/google` — email stored with wallet
- **Anonymous wallet** — create instantly, no account needed
- **Wallet restore** — paste 24-word seed phrase to recover
- **Freighter completely removed** — all signing via localStorage keypair
- All wallet pages (dashboard, send, receive, swap, assets) work without any browser extension

### Payment Links
1. **Sender**: Generates 32-byte secret → SHA-256 → `create_link()` → contract escrows tokens
2. **Recipient**: Opens URL with `#secretHex` → generates a real UltraHonk ZK proof client-side → backend
   attester verifies it off-chain and submits an on-chain attestation → calls `claim_link()` → contract
   checks both `sha256(secret) == link_hash` **and** the attestation → tokens released

### ZK Architecture — Attestation Oracle (today) → Native Verification (future)

Real ZK, not a demo: the Noir circuit (`circuits/`) proves knowledge of the link secret without revealing
it, and a genuine UltraHonk proof is generated and cryptographically verified (`@aztec/bb.js`). What's
*not* native yet is on-chain verification — Soroban doesn't have BN254 pairing host functions today
(CAP-0074 is proposed, not implemented; BLS12-381 is live via CAP-0059, but this toolchain targets BN254).
So the proof is verified off-chain by a trusted attester service instead, which then attests on-chain:

```
Today:
  Browser  --generate UltraHonk proof-->  Backend attester
  Backend  --verify proof, recompute expected public inputs from the secret-->  (valid?)
  Backend  --sign + submit attest()-->  Soroban VerifierContract
  Soroban  --claim_link() checks is_attested()-->  Escrow releases funds

Future (once CAP-0074 ships):
  Browser  --generate UltraHonk proof-->  Soroban VerifierContract (native BN254 verify)
  Soroban  --claim_link() checks verify_proof() directly-->  Escrow releases funds
  (no attester, no backend trust assumption)
```

**Known tradeoff, stated plainly:** the attester is a single, centralized, documented trust assumption —
if that service is down, claims can't be attested. This is the interim pattern Stellar's own docs
recommend for Noir circuits on Stellar today, not a workaround invented for this hackathon; it's removable
once native BN254 verification lands. See `contracts/README.md` and the
[contracts walkthrough](./contracts/walkthrough/allwalkthrough.md) Part 9 for the full mechanics, including
why `bb.js` proof generation looked broken for weeks and turned out to be a version-pin bug, not an
architectural dead end.

## Monorepo Structure

```
atreus/
├── frontend/          Next.js 15 web app (wallet + payment links)
├── backend/           Express API — ZK attestation-oracle service
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

### Quick Start

```bash
# Frontend only
cd frontend
npm install
cp .env.example .env.local   # edit with your values (Google Client ID + contract IDs)
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
# Required — Soroban contract IDs
NEXT_PUBLIC_CONTRACT_ID=CCZSFPZ6XPZBUPBGQ5FRP5BMW5HKZIZNCWPLJAHNOWP4ZI7BZSMJDTCD
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD
NEXT_PUBLIC_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# Required for Google OAuth sign-in
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Backend needs its own `.env` (see `backend/.env.example`) with an `ATTESTER_SECRET_KEY` — a dedicated,
funded testnet keypair used to sign attestations. Never commit this file (already gitignored).

## Pages

| Route | Feature | Auth |
|-------|---------|------|
| `/` | Landing page | None |
| `/wallet` | Create/manage wallet (Google, anonymous, restore) | localStorage |
| `/dashboard` | Balance, assets, actions, tx history | localStorage |
| `/send` | Send XLM | localStorage |
| `/receive` | Receive — copy address | localStorage |
| `/swap` | XLM → token via Stellar DEX | localStorage |
| `/assets` | Add trustlines (USDC, EURT, custom) | localStorage |
| `/create` | Create payment link | localStorage |
| `/claim` | Claim payment link | localStorage |

## Design System

**Semantic CSS classes only — no raw Tailwind utilities in components.** 30+ classes defined in `globals.css` at `@layer components`.

Key classes: `.page`, `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.status-error`, `.status-success`, `.icon-sm`, `.icon-md`, `.icon-lg`, `.mnemonic-grid`, `.mnemonic-word`, `.action-grid`, `.divider`, `.divider-hr`, `.divider-line`, `.balance-value`, `.inline-link`.

## Deployed Contracts (Testnet)

| Contract | ID |
|----------|-----|
| VerifierContract | `CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD` |
| AtreusContract | `CCZSFPZ6XPZBUPBGQ5FRP5BMW5HKZIZNCWPLJAHNOWP4ZI7BZSMJDTCD` |

## Packages

| Package | Tech | What it does |
|---------|------|-------------|
| `frontend/` | Next.js 15, React 19, Tailwind CSS | Wallet + payment links UI |
| `backend/` | Express, TypeScript, `bb.js` | ZK attestation-oracle service — verifies real UltraHonk proofs off-chain, signs on-chain attestations |
| `contracts/` | Rust, Soroban SDK 22.0.0 | Escrow contract + VerifierContract (attestation oracle) |
| `circuits/` | Noir 1.0.0-beta.22 | Pedersen-based ZK proof circuit |

## Known Issues

- Soroban has no BN254 host functions yet (CAP-0074 proposed, not implemented) — full on-chain ZK
  verification isn't possible on the public network today, hence the attestation-oracle pattern. This is
  a protocol capability gap, not a bug in this repo.
- The attester is a single centralized keypair — a documented trust assumption and single point of
  failure by design, removable once CAP-0074 ships (see ZK Architecture section above).
- `/docs/architecture.md` and `/docs/design.md` are stale
- Testnet has limited DEX liquidity — swap may fail for some token pairs
- Browser-side proof generation (WASM) may take 5–10s on cold start

## Docs

- Walkthrough files in each package's `walkthrough/` directory
- [Frontend Walkthrough](./frontend/walkthrough/allwalkthrough.md)
- [Contracts Walkthrough](./contracts/walkthrough/allwalkthrough.md)
- [Circuits Walkthrough](./circuits/walkthrough/allwalkthrough.md)

## License

MIT
