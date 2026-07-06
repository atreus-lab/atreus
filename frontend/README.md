# Atreus Frontend

Next.js 15 web app for creating and claiming Stellar payment links with ZK proofs.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/wallet` | Create / restore wallet (Google OAuth, anonymous, seed phrase) |
| `/dashboard` | Balance, assets, transaction history, quick actions |
| `/send` | Send XLM to any Stellar address |
| `/receive` | Copy address + explorer link |
| `/swap` | XLM → USDC/EURT via Stellar DEX |
| `/assets` | Add trustlines (USDC, EURT, custom) |
| `/create` | Create escrow payment link |
| `/claim` | Claim funds via ZK proof flow |
| `/activity` | Transaction history and activity feed |
| `/analytics` | Wallet analytics and charts |
| `/profile` | User profile and preferences |
| `/security` | Security settings and passkeys |
| `/settings` | Network, address book, notifications |

## Libraries

| File | What it does |
|------|-------------|
| `src/lib/stellar.ts` | `connectWallet()`, `createEscrowTx()`, `claimLinkTx()`, Soroban tx building + signing |
| `src/lib/zk.ts` | Client-side ZK proof generation: `generateClaimProof()`, `requestAttestation()` |
| `src/lib/proof.ts` | `hexToBytes()`, `bytesToHex()` utilities |
| `src/lib/wallet.ts` | BIP39 mnemonic wallet: create, restore, store, sign |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (semantic classes) |
| Blockchain | Stellar / Soroban |
| SDK | `@stellar/stellar-sdk@^16.0.1` |
| ZK proving | `@aztec/bb.js@5.0.0-nightly.20260522` + `@noir-lang/noir_js@1.0.0-beta.22` |
| Icons | lucide-react |

## Getting Started

```bash
# Install dependencies
pnpm --filter atreus-frontend install

# Configure
cp frontend/.env.example frontend/.env.local
# Edit .env.local — add your Google Client ID and contract IDs

# Start development server
pnpm --filter atreus-frontend dev    # localhost:3000
```

## Claim Flow

`/claim#<secretHex>` triggers the ZK attestation flow:

1. **`generateClaimProof(secretBytes, recipient)`** — loads the compiled Noir circuit, computes field-domain values, generates an UltraHonk proof
2. **`requestAttestation(linkHashHex, secretHex, proofHex, recipient)`** — POSTs the proof to the backend attester service
3. **`claimLinkTx(recipient, linkHash, secretBytes)`** — calls the escrow contract's `claim_link()` which checks the attestation before releasing funds

## Project Structure

```
frontend/
├── public/circuits/       # Compiled Noir circuit (served to browser)
├── scripts/               # ZK tooling scripts
└── src/
    ├── app/               # 14 pages (App Router)
    ├── components/        # 15 reusable components
    ├── constants/         # Navigation items
    └── lib/               # Wallet, Stellar, ZK, passkey utilities
```

## Design

Dark theme with slate color palette. CSS custom properties in `globals.css`. Typography: Manrope (headings), Inter (body). Semantic CSS classes only — no raw Tailwind utilities in components.

## License

MIT
