# Atreus — Full Project Context

## What We're Building
Privacy-preserving payment links + full-featured Stellar wallet. Built for "Stellar Hacks: Real-World ZK" hackathon.

## The Team (atreus-lab org on GitHub)
- amankoli09 — UI/Frontend
- Oluwatos94 — team member
- Shadow-MMN — auth, wallet, backend, contracts
- shogun444 — ZK circuits, contracts
- temisan0x — team member

All 5 have admin role in the org.

## Codebase Structure
```
atreus/
├── frontend/          Next.js 15 web app (wallet UI + payment link pages)
│   └── src/
│       ├── app/               App router pages
│       │   ├── page.tsx       Landing page (hero + feature grid)
│       │   ├── layout.tsx     Root layout with GoogleOAuthProvider
│       │   ├── globals.css    Global styles (dark theme, glass cards)
│       │   ├── wallet/        Wallet creation/restore/Google auth
│       │   ├── dashboard/     Main wallet dashboard (balance, actions, txns)
│       │   ├── send/          Send XLM
│       │   ├── receive/       Receive (copy address)
│       │   ├── swap/          XLM → USDC/EURT via Stellar DEX
│       │   ├── create/        Create ZK payment link
│       │   ├── claim/         Claim ZK payment link
│       │   └── assets/        Manage trustlines
│       └── lib/
│           ├── wallet.ts      Wallet storage, BIP39, Keypair, friendbot funding
│           ├── stellar.ts     Soroban contract calls (createEscrowTx, claimLinkTx)
│           ├── zk.ts          Client-side ZK proof generation + attestation request
│           └── proof.ts       hexToBytes / bytesToHex helpers
├── backend/           Express API (ZK attestation-oracle service)
│   └── src/
│       ├── index.ts           Express server (port 3001)
│       ├── routes/links.ts    POST /api/links/:hash/attest — verify ZK proof + submit attestation
│       └── lib/
│           ├── stellar.ts     submitAttestation() — calls VerifierContract.attest()
│           └── zk.ts          Pedersen hash, verifyClaimProof (off-chain UltraHonk verification)
├── contracts/         Rust + Soroban smart contracts
│   ├── atreus-contract/   Escrow + claim logic (create_link, claim_link, refund_link)
│   └── verifier-contract/ ZK attestation (attest, is_attested)
└── circuits/          Noir ZK circuit (Pedersen hash — "secret" binary)
    └── src/           main.nr, policies/secret.nr
```

## Tech Stack
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, @stellar/stellar-sdk@16, @aztec/bb.js@5.0.0-nightly.20260522, @noir-lang/noir_js@1.0.0-beta.22, @react-oauth/google
- **Backend:** Express 4, TypeScript, @stellar/stellar-sdk@16, @aztec/bb.js, pino, helmet, cors
- **Contracts:** Soroban SDK 22.0.0 (Rust), compiled with soroban-cli
- **Circuits:** Noir 1.0.0-beta.22

## Current Status (as of Jul 2, 2026)

### Working
- Wallet creation/restore (BIP39 mnemonic, localStorage keys)
- Google OAuth sign-in (needs real client ID)
- Dashboard with balance, asset list, transaction history
- Send XLM
- Receive (copy address)
- Swap XLM → USDC/EURT via Stellar DEX
- Manage Assets (trustlines)
- All Soroban contracts deployed on testnet
- ZK proof generation (client-side bb.js UltraHonk)
- Backend attestation oracle (ZK verification off-chain)
- Both `npm run build` and `npm run lint` pass

### Broken / Needs Work
1. **Google OAuth** — `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is a placeholder. Create a real Web OAuth 2.0 client ID at Google Cloud Console, add `http://localhost:3000` as authorized JS origin, put it in `frontend/.env`.
2. **Create/Claim link flow** — Was not tested end-to-end because env files were missing. Now set up (contract IDs in `.env`, attester key funded). Needs manual test: create wallet, fund it, create link, claim link, verify balance deduction/credit.
3. **Landing page design** — Was improved in session 2 but can be further refined.
4. **Feature parity** — Some placeholder routes exist (`/api/links` POST and GET in backend) that aren't fully implemented.

## Key Contracts (Testnet)
- AtreusContract: `CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2`
- VerifierContract: `CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB`
- Token (XLM SAC): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

## Contract Logic
- **AtreusContract.create_link(id, policy_type, policy_params, amount, asset, expiry, sender):** Transfers `amount` of `asset` from sender to contract (escrow), stores `LinkInfo`. `id` is SHA-256(secret) — the claimant must prove knowledge of the raw secret later.
- **AtreusContract.claim_link(link_hash, recipient, secret):** Checks SHA-256(secret) == link_hash, checks `VerifierContract.is_attested(link_hash, recipient)`, checks nullifier not used, then transfers escrowed tokens to recipient. Sets claimed=true.
- **VerifierContract.attest(attester, link_hash, recipient):** Only callable by the trusted attester keypair. Records that this (link_hash, recipient) pair has been ZK-verified.
- **VerifierContract.is_attested(link_hash, recipient):** Returns true if attester has attested this pair.

## Claim Flow (Detailed)
1. FE generates 32-byte random secret, computes SHA-256(secret) = link_hash
2. FE calls AtreusContract.create_link(link_hash, ..., sender) — sender must sign, tokens move to escrow
3. FE constructs URL with `#secretHex` fragment — sender shares this with recipient
4. Recipient opens URL, FE reads `location.hash` to get secretHex
5. FE generates UltraHonk ZK proof proving knowledge of secret bound to recipient address (Pedersen hashes via bb.js + Noir circuit)
6. FE POSTs proof + secret + recipient → backend `/api/links/:hash/attest`
7. Backend independently recomputes public inputs (doesn't trust client), verifies proof via bb.js
8. If valid, backend calls VerifierContract.attest(attester, link_hash, recipient) — signed by attester keypair
9. FE calls AtreusContract.claim_link(link_hash, recipient, secret) — contract checks SHA-256 + is_attested → transfers tokens to recipient
10. Double-claim prevented via nullifier (SHA-256 of link_hash)

## Attester Keypair
- Public: `GCTBLGJHVRJO5AQT2CRYGJXEOBAY4LZYDYOOQOSYIBTB3PW6OMWQUNM6`
- Secret: Stored in `backend/.env` as `ATTESTER_SECRET_KEY`
- Funded on testnet (friendbot)

## Environment Files

### frontend/.env
```
NEXT_PUBLIC_CONTRACT_ID=CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB
NEXT_PUBLIC_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com  ← NEEDS REAL VALUE
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_secret
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### backend/.env
```
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB
ATTESTER_SECRET_KEY=SBG5O2D4Q63IPJNQURZSW4TPJ6WIBSSE6I4DRXAD4VXSIENX6JPEEO5P
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
PORT=3001
```

Note: The backend env uses `NEXT_PUBLIC_VERIFIER_CONTRACT_ID` (not just `VERIFIER_CONTRACT_ID`) for consistency with the frontend. The `submitAttestation` function reads it.

## UI Design (As of Jul 2)
- Dark theme: `#13131a` background, `#1c1c26` elevated surfaces, `#22222e` interactive elements
- Accent: Purple gradient `#7c6ff0 → #9185f2`
- Apple Pay style balance card (gradient purple)
- Glassmorphism cards via `rgba` borders and elevated backgrounds
- All utility classes (Tailwind) as team requested
- Font: Manrope (headings), Inter (body)
- Design inspo: Coinbase UI, Apple Pay, beUI components
- Pages: Landing (hero + feature grid), Wallet, Dashboard, Send, Receive, Swap, Create, Claim, Assets

## Known Issues
1. Landing page design can be further refined — team wants Coinbase/Apple Pay level polish
2. Create/Claim link flow never tested end-to-end — env was missing previously
3. Google OAuth needs real client ID from Google Cloud Console
4. CORS might need tuning in production (currently using `cors()` with defaults)
5. The `POST /api/links` and `GET /api/links/:hash` backend routes return mock data — not wired to contract
6. The `@/lib/wallet.ts` uses `bip39.mnemonicToSeed` which can be slow on mobile
7. `pnpm-lock.yaml` at workspace root conflicts with `package-lock.json` — consider removing one

## Running Locally
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

## Build Commands
- `cd frontend && npm run build` — builds Next.js (don't use `next build` directly due to workspace config)
- `cd frontend && npm run lint` — runs next lint
- `cd backend && npm run lint` — runs tsc --noEmit
- `cd backend && npm run build` — compiles TypeScript to dist/

## Git Branches
- `main` — deployable branch
- All team members push to their own branches/forks and make PRs

## What To Do Next
1. Get a real Google OAuth client ID from Google Cloud Console and set it in `frontend/.env`
2. Test the create/claim payment link flow end-to-end:
   - Start both frontend and backend
   - Create a wallet on /wallet (gets funded by friendbot)
   - Go to /create, enter amount, click Generate Link
   - Copy the URL, open incognito or new browser
   - Open the URL, click Claim → should generate ZK proof → attest → claim
   - Verify sender XLM deducted and recipient XLM credited
3. Wire up `POST /api/links` and `GET /api/links/:hash` in backend to actually interact with the contract
4. Polish the landing page further (the hero + feature grid is basic)
5. Remove one of the lockfiles (pnpm-lock.yaml or package-lock.json) to silence the Next.js warning
6. Deploy: Next.js frontend to Vercel, Express backend to Railway/Render/Fly
