# Atreus Frontend

Next.js 15 web app for creating and claiming Stellar payment links.

## What's Implemented

### Pages

| Route | File | What it does |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Landing page with "Create Link" and "Claim Funds" buttons |
| `/create` | `src/app/create/page.tsx` | Create payment link: Freighter connect → enter amount → generate secret → SHA-256 → submit Soroban tx → display shareable URL |
| `/claim` | `src/app/claim/page.tsx` | Claim funds: parse secret from URL hash → Freighter connect → SHA-256 → submit claim tx |

### Libraries

| File | What it does |
|------|-------------|
| `src/lib/stellar.ts` | `connectWallet()`, `createEscrowTx()`, `claimLinkTx()` — Soroban tx building + Freighter signing |
| `src/lib/passkey.ts` | Stub — `registerPasskey()` and `signWithPasskey()` log to console, return mock data |

### Scripts

| File | What it does |
|------|-------------|
| `scripts/compile-circuit.mjs` | Compiles Noir circuit via `@noir-lang/noir_wasm` |
| `scripts/prove-circuit.mjs` | Generates UltraHonk proof via `@aztec/bb.js` (crashes on Windows) |
| `scripts/verify-pedersen.mjs` | Verifies bb.js Pedersen hash matches Noir `pedersen_hash` (confirmed: hashIndex=0) |
| `scripts/verify-poseidon.mjs` | Tests Poseidon compatibility (poseidon-lite ≠ Noir Poseidon2 — different outputs) |

### Design

Dark theme with slate color palette. CSS custom properties in `globals.css`. Typography: Manrope (headings), Inter (body). Tailwind CSS for utility classes + semantic component classes (`.card`, `.btn-primary`, `.btn-claim`, etc.).

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Blockchain | Stellar / Soroban |
| SDK | `@stellar/stellar-sdk` ^16.0.1 |
| Wallet | `@stellar/freighter-api` ^6.0.1 |
| Icons | lucide-react |

## Getting Started

```bash
pnpm install
pnpm dev        # localhost:3000
pnpm build      # production build
```

## Environment

Copy `../.env.example` to `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ID=    # Soroban contract address (after deploy)
NEXT_PUBLIC_TOKEN_ID=       # XLM Stellar Asset Contract address on testnet
```

## Project Structure

```
src/
├── app/
│   ├── globals.css       # Tailwind + CSS custom properties
│   ├── layout.tsx        # Root layout (Inter + Manrope fonts)
│   ├── page.tsx          # Landing page
│   ├── create/
│   │   └── page.tsx      # Create link page
│   └── claim/
│       └── page.tsx      # Claim link page
├── lib/
│   ├── stellar.ts        # Soroban tx building + Freighter signing
│   └── passkey.ts        # Passkey stub (not used in MVP)
scripts/
├── compile-circuit.mjs   # Noir circuit compiler
├── prove-circuit.mjs     # UltraHonk proof generator
├── verify-pedersen.mjs   # Pedersen hash verification
└── verify-poseidon.mjs   # Poseidon compatibility test
```

**Note:** `components/`, `hooks/`, `services/`, `types/`, `zk/` directories do not exist yet. All UI is inline in page components.

## Key Dependencies

- `@aztec/bb.js` ^4.4.0 — Barretenberg (UltraHonk proof generation, Pedersen hash)
- `@noir-lang/noir_wasm` 1.0.0-beta.22 — Noir compiler for browser/Node
- `@noir-lang/noir_js` 1.0.0-beta.22 — Noir JS runtime
- `buffer` ^6.0.3 — Buffer polyfill for `@stellar/stellar-sdk` in browser

## License

MIT
