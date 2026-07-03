# Atreus Frontend

Next.js 15 web app for creating and claiming Stellar payment links with real ZK proofs.

## What's Implemented

### Pages

| Route | File | What it does |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Landing page |
| `/wallet` | `src/app/wallet/page.tsx` | Create / restore wallet (Google OAuth, anonymous, seed phrase) |
| `/dashboard` | `src/app/dashboard/page.tsx` | Balance, assets, tx history, quick actions |
| `/send` | `src/app/send/page.tsx` | Send XLM to any Stellar address |
| `/receive` | `src/app/receive/page.tsx` | Copy address + explorer link |
| `/swap` | `src/app/swap/page.tsx` | XLM → USDC/EURT via Stellar DEX |
| `/assets` | `src/app/assets/page.tsx` | Add trustlines (USDC, EURT, custom) |
| `/create` | `src/app/create/page.tsx` | Create escrow payment link |
| `/claim` | `src/app/claim/page.tsx` | Claim funds via real ZK proof flow |
| `/activity` | `src/app/activity/page.tsx` | Transaction history and activity feed |
| `/analytics` | `src/app/analytics/page.tsx` | Wallet analytics and charts |
| `/profile` | `src/app/profile/page.tsx` | User profile and preferences |
| `/security` | `src/app/security/page.tsx` | Security settings and passkeys |
| `/settings` | `src/app/settings/page.tsx` | Network, address book, notifications |

### Libraries

| File | What it does |
|------|-------------|
| `src/lib/stellar.ts` | `connectWallet()`, `createEscrowTx()` (with balance check), `claimLinkTx()` (with funded-account check), Soroban tx building + signing |
| `src/lib/zk.ts` | **New** — client-side ZK proof generation: `generateClaimProof()`, `requestAttestation()` |
| `src/lib/proof.ts` | `hexToBytes()`, `bytesToHex()` utilities |
| `src/lib/wallet.ts` | BIP39 mnemonic wallet: create, restore, store, sign |

### Scripts

| File | What it does |
|------|-------------|
| `scripts/prove-circuit-test.mjs` | Generates UltraHonk proof from static witness (confirmed: 14,656 bytes, verified: true) |
| `scripts/prove-circuit.mjs` | Generates proof + exports VK |
| `scripts/verify-pedersen.mjs` | Verified: bb.js `hashIndex=0` matches Noir `pedersen_hash` |
| `scripts/verify-poseidon.mjs` | Poseidon compatibility test |
| `scripts/compile-circuit.mjs` | Noir circuit compiler via `@noir-lang/noir_wasm` |

### Design

Dark theme with slate color palette. CSS custom properties in `globals.css`. Typography: Manrope (headings), Inter (body). **Semantic CSS classes only** — no raw Tailwind utilities in components. See `docs/design.md`.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (semantic classes only) |
| Blockchain | Stellar / Soroban |
| SDK | `@stellar/stellar-sdk@^16.0.1` |
| ZK proving | `@aztec/bb.js@5.0.0-nightly.20260522` (exact) + `@noir-lang/noir_js@1.0.0-beta.22` |
| Icons | lucide-react |

## Getting Started

```bash
# From repo root (pnpm workspace)
pnpm --filter atreus-frontend install

cp frontend/.env.example frontend/.env.local
# Edit .env.local — fill in your Google Client ID

# Also start the backend for the claim flow:
npx tsx --env-file=backend/.env backend/src/index.ts  # :3001

pnpm --filter atreus-frontend dev    # localhost:3000
```

## Environment Variables

```env
# Required
NEXT_PUBLIC_CONTRACT_ID=CCZSFPZ6XPZBUPBGQ5FRP5BMW5HKZIZNCWPLJAHNOWP4ZI7BZSMJDTCD
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD
NEXT_PUBLIC_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Required for claim flow (backend attestation-oracle)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Claim Flow (Real ZK)

`/claim#<secretHex>` triggers the full ZK attestation-oracle flow:

1. **`generating_proof`** — `generateClaimProof(secretBytes, recipient)`:
   - Loads `circuits/secret.json` from `/circuits/secret.json` (in `public/`)
   - Computes field-domain values: `secretField`, `recipientField` via `BigInt % FR_ORDER`
   - Runs Pedersen hash (bb.js `hashIndex=0`) for `link_hash` and `nullifier`
   - Executes Noir circuit via `Noir.execute(inputs)` → witness
   - Generates real 14,656-byte UltraHonk proof via `UltraHonkBackend.generateProof(witness)`

2. **`attesting`** — `requestAttestation(linkHashHex, secretHex, proofHex, recipient)`:
   - POSTs `{ recipient, secret, proof }` to `NEXT_PUBLIC_BACKEND_URL/api/links/:hash/attest`
   - Backend independently recomputes expected public inputs, verifies proof, submits on-chain attestation

3. **`claiming`** — `claimLinkTx(recipient, linkHash, secretBytes)`:
   - Calls `AtreusContract.claim_link()` — now gated on `VerifierContract.is_attested()` being true
   - SHA-256 secret check + attestation check both pass → funds released

## Project Structure

```
frontend/
├── .env.local              # Gitignored — real config
├── .env.example            # Template (no secrets)
├── public/
│   └── circuits/
│       └── secret.json     # Compiled Noir circuit (fetched by browser for proof gen)
├── scripts/                # Node.js ZK tooling scripts
└── src/
    ├── app/
    │   ├── globals.css     # Tailwind + CSS custom properties
    │   ├── layout.tsx      # Root layout (fonts, GoogleOAuthProvider)
    │   ├── page.tsx        # Landing
    │   ├── activity/       # Transaction history
    │   ├── analytics/      # Wallet analytics
    │   ├── assets/         # Trustlines
    │   ├── claim/          # Claim link — real ZK proof flow
    │   ├── create/         # Create payment link
    │   ├── dashboard/      # Balance, tx history, payment links
    │   ├── profile/        # User profile
    │   ├── receive/        # Address display
    │   ├── security/       # Security settings
    │   ├── send/           # XLM send
    │   ├── settings/       # Network, address book, notifications
    │   ├── swap/           # DEX swap
    │   └── wallet/         # Wallet creation/restore
    ├── components/          # 15 reusable components (AppSidebar, AppHeader, SearchDialog,
    │                       # BalanceCard, DashboardSidebar, PaymentLinks, etc.)
    ├── constants/
    │   └── navigation.ts   # Shared nav items + getNavItems() helper
    └── lib/
        ├── stellar.ts      # Soroban tx building, signing, balance checks
        ├── zk.ts           # Client-side ZK proof generation + attestation POST
        ├── proof.ts        # hexToBytes / bytesToHex utilities
        ├── wallet.ts       # BIP39 mnemonic wallet
        ├── links.ts        # Payment links local storage + on-chain checks
        ├── passkey.ts      # WebAuthn passkey utilities
        ├── ease.ts         # EASE attestation utilities
        └── utils.ts        # General utilities
```

## License

MIT
