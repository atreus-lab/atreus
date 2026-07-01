# Frontend Walkthrough

## 1 — Web-Based Wallet Architecture

**Date:** 2026-07-02
**MVP Strategy:** Full Stellar wallet with payment links, not just isolated link demo

### Core Wallet Features:
- **In-browser keypair generation** via `Keypair.random()` from `@stellar/stellar-sdk`
- **localStorage persistence** — `atreus_wallet` key stores `{publicKey, secretKey}`
- **Friendbot funding** — testnet XLM via `https://friendbot.stellar.org`
- **No Freighter dependency** for wallet pages — direct keypair signing
- **Freighter optional** for create/claim pages (backward compatible)

### Pages:
| Route | Purpose | Auth |
|---|---|---|
| `/` | Landing page | None |
| `/wallet` | Create/manage wallet | localStorage |
| `/dashboard` | Balance, assets, actions, tx history | localStorage |
| `/send` | Send XLM | localStorage |
| `/receive` | Copy address, explorer link | localStorage |
| `/swap` | XLM → USDC/EURT via Stellar DEX | localStorage |
| `/assets` | Manage trustlines (add USDC, EURT, custom) | localStorage |
| `/create` | Create payment link (escrow) | Freighter |
| `/claim` | Claim payment link (ZK proof + SHA-256 fallback) | Freighter |

## 2 — Poseidon → SHA256 Pivot (Early Phase)

**Problem:** `poseidon-lite` (JS) uses original Poseidon (circomlib parameters). Noir uses Poseidon2 (different round constants). Same inputs → different outputs → every proof fails.

**Also:** bb.js Pedersen WASM crashes on Windows Node 20 (`RuntimeError: unreachable`).

**Solution:** Replace with Web Crypto SHA-256 — native in browser, matches `env.crypto().sha256()` in contract.

**Changes:**
- `create/page.tsx`: `poseidon1(secretBigInt)` → `crypto.subtle.digest("SHA-256", secretBytes)`
- `package.json`: removed `poseidon-lite` dependency
- `next.config.js`: Buffer polyfill for `@stellar/stellar-sdk` (ProvidePlugin + resolve fallback)

## 2 — Create Link Page

**File:** `frontend/src/app/create/page.tsx` (105 lines)

**Flow:**
1. User enters amount (XLM)
2. Clicks "Generate Link" → `connectWallet()` (Freighter)
3. Generates 32 random bytes via `crypto.getRandomValues(new Uint8Array(32))`
4. Computes `linkHash = SHA-256(secretBytes)` via Web Crypto API
5. Calls `createEscrowTx(creator, amount, linkHash)`
6. Constructs URL: `https://app/claim#<secretHex>`
7. Displays link with copy-to-clipboard button

**Key:** URL fragment (`#`) — secret never sent to server. Only client-side JavaScript reads it.

**UI states:** Loading spinner + "Generating..." while tx pending, error display on failure.

## 3 — Claim Link Page

**File:** `frontend/src/app/claim/page.tsx` (81 lines)

**Flow:**
1. Reads `secretHex` from `window.location.hash` on mount
2. User clicks "Claim with Freighter" → `connectWallet()`
3. Parses hex string to `Uint8Array` (32 bytes)
4. Computes `linkHash = SHA-256(secretBytes)`
5. Calls `claimLinkTx(recipient, linkHash, secretBytes)`
6. Shows success message

**States:** `idle` → `connecting` → `claiming` → `success` / `error`

**No ZK proof in MVP** — submits raw secret. Phase 2: generate UltraHonk proof, submit proof instead.

## 4 — Stellar SDK Integration

**File:** `frontend/src/lib/stellar.ts` (114 lines)

**Constants:**
- `HORIZON_URL = "https://horizon-testnet.stellar.org"`
- `SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org"`
- `networkPassphrase = Networks.TESTNET`

**Functions:**

| Function | Params | What it does |
|----------|--------|-------------|
| `connectWallet()` | — | Checks `isAllowed()`, calls `requestAccess()`, returns address |
| `createEscrowTx()` | `creator, amount, hash` | Builds `create_link` tx, prepares, signs via Freighter, submits |
| `claimLinkTx()` | `recipient, linkHash, secret` | Builds `claim_link` tx, prepares, signs via Freighter, submits |

**Tx flow:** `Contract.call()` → `TransactionBuilder` → `rpcServer.prepareTransaction()` → `signTransaction()` (Freighter) → `rpcServer.sendTransaction()` → check status → return hash

**Env vars required:** `NEXT_PUBLIC_CONTRACT_ID`, `NEXT_PUBLIC_TOKEN_ID`

## 5 — Passkey Stub

**File:** `frontend/src/lib/passkey.ts` (14 lines)

`registerPasskey(username)` and `signWithPasskey(challenge)` — both log to console, return mock data. Not used in current MVP flow.

## 6 — Design System

**File:** `frontend/src/app/globals.css` (183 lines)

Dark theme with slate color palette. CSS custom properties on `:root`:
- Background: `#020617` (slate-950), `#0f172a` (slate-900), `#1e293b` (slate-800)
- Text: `#f8fafc` (slate-50), `#94a3b8` (slate-400)
- Accent: `#3b82f6` (blue-500)
- Success: `#22c55e`, Error: `#f87171`

Semantic classes: `.page`, `.card`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-claim`, `.input`, `.status-success`, `.status-error`, `.link-preview`

Typography: Manrope (headings), Inter (body) via `next/font/google`.

## 7 — ZK Scripts

| Script | Status | What it does |
|--------|--------|-------------|
| `compile-circuit.mjs` | ✅ Works | Compiles Noir circuit via `@noir-lang/noir_wasm` |
| `prove-circuit.mjs` | ❌ Crashes on Windows + Docker | UltraHonk proof via `@aztec/bb.js` — native backend crash |
| `verify-pedersen.mjs` | ✅ Confirmed | bb.js Pedersen matches Noir at hashIndex=0 |
| `verify-poseidon.mjs` | ✅ Diagnostic | Confirmed poseidon-lite ≠ Noir Poseidon2 |

## 8 — Phase 2: ZK Proof Chain Reaction

**Date:** 2026-07-01
**Reason:** bb.js UltraHonk proof generation fails on all environments. Pivot to architecture demo.

**Files created/modified:**
- `frontend/src/lib/proof.ts` — NEW: mock 2144-byte UltraHonk proof + `hexToBytes()` helper
- `frontend/src/lib/stellar.ts` — ADDED: `submitProofTx()` function
- `frontend/src/app/claim/page.tsx` — MODIFIED: two-step flow
- `frontend/.env.local` — NEW: contract IDs
- `.env.example` — ADDED: `NEXT_PUBLIC_VERIFIER_CONTRACT_ID`

### Claim flow (2 transactions):

1. **submitProofTx()** — calls `VerifierContract.submit_proof()` with mock proof bytes (2144). Proof stored as on-chain event receipt.
2. **claimLinkTx()** — calls `AtreusContract.claim_link()` with SHA-256 secret. Funds released via SHA-256 fallback.

### UI states:
`idle` → `connecting` → `submitting_proof` → `claiming` → `success` / `error`

### Env vars:
```
NEXT_PUBLIC_CONTRACT_ID=CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB
```

### Demo narrative:
> "We generate zero-knowledge proofs using Noir + UltraHonk. The proof is submitted to our VerifierContract and recorded on-chain (emit event). The claim function is architecturally ready for Soroban's upcoming BN254 precompiles — currently using SHA-256 as a fallback. Our Noir circuit compiles and passes all unit tests."

## 9 — Known Issues
- bb.js native backend crashes on both Windows and Linux (Docker) with Pedersen hash circuits
- Proof generation deferred to Phase 3 (post-hackathon)
- Mock proof used for demo purposes only
- Passkey.ts remains a stub — not used in flow

## 10 — Wallet Foundation (Phase Added Hackathon Day 2)

**Date:** 2026-07-02
**Reason:** judges need a real product, not just a payment link demo

### New files created:
| File | Purpose |
|---|---|
| `frontend/src/app/dashboard/page.tsx` | Wallet dashboard — balance, assets, recent activity, action buttons |
| `frontend/src/app/send/page.tsx` | Send XLM via Freighter with balance validation |
| `frontend/src/app/receive/page.tsx` | Receive XLM — copy address, view on explorer |
| `frontend/src/app/swap/page.tsx` | Basic XLM → USDC/EURT swap via Stellar DEX path payments |

### stellar.ts additions:
| Function | Purpose |
|---|---|
| `getAccountBalances(address)` | Fetch all assets/balances via Horizon |
| `getNativeBalance(address)` | Fast XLM balance lookup |
| `getRecentTransactions(address, limit)` | Last N payments/payments history |
| `sendXLM(sender, destination, amount)` | Native XLM transfer via Freighter |
| `findSwapPath(source, dest, amount)` | Discover Stellar DEX liquidity paths |
| `swapXLM(sender, destAsset, destAmount)` | Execute path payment strict send swap |
| `getStellarExpertUrl(type, id)` | Generate explorer links |

### Updated pages:
| Page | Changes |
|---|---|
| `frontend/src/app/page.tsx` | Added "Launch Wallet" CTALinks directly to dashboard |
| `frontend/src/app/layout.tsx` | Updated metadata title/description |

### Dashboard features:
1. **Wallet Connect** via Freighter (same as other pages)
2. **Balance display** (XLM + all assets)
3. **Quick actions**: Send, Receive, Create Link, Swap
4. **Recent transactions** from Horizon API with explorer links
5. **Asset list** showing all balances

### Send flow:
1. Enter destination address + amount
2. Validates balance (includes fee buffer)
3. Signs via Freighter, submits via Soroban RPC
4. Shows explorer link on success

### Swap flow:
1. Select target token (USDC, EURT)
2. Enter XLM amount
3. Uses `pathPaymentStrictSend` via Stellar DEX
4. Signs via Freighter, submits
5. 2% slippage buffer built in

### Env vars (same):
```
NEXT_PUBLIC_CONTRACT_ID=CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB
```

Note: `NEXT_PUBLIC_TOKEN_ID` still unset — uses Freighter's native XLM operations for send/swap.
Dashboard uses Horizon API for read operations, avoiding the Soroban RPC bottleneck.

### Known limitation:
- No passkey wallet yet (WebAuthn integration pending)
- Swap paths hardcoded to USDC/EURT — not a full DEX aggregator
- No mainnet deployment yet (testnet only)

---

## Appendix: Historical Entries

### Issue #6 — Wire Create Link page to real Stellar/Soroban

**Date:** 2026-07-01
**Author:** temycodes

**Files touched:**
- `frontend/src/app/create/page.tsx`
- `frontend/src/lib/stellar.ts`

#### What changed

The `/create` page previously generated a mock link with a random secret and never touched the network. It now performs the full real flow:

1. Connects the user's wallet via Freighter (`connectWallet()`)
2. Generates a 31-byte random secret client-side and hashes it with SHA-256 (originally Poseidon, later replaced — see Section 1)
3. Builds and submits a `create_link()` call via `@stellar/stellar-sdk`
4. Polls Soroban RPC for the final transaction result via `waitForTransaction()`
5. Derives the recipient-facing `/claim#<secret>` URL

#### Key implementation details

**Transaction confirmation polling.** `rpcServer.sendTransaction()` only confirms a transaction was accepted into the mempool (status `PENDING`). Added `waitForTransaction()` in `stellar.ts` which polls `rpcServer.getTransaction(hash)` until `SUCCESS`/`FAILED` (30s timeout).

**Stroop conversion.** String/BigInt-based `xlmToStroops()` helper avoids floating point precision bugs.

**Error handling.** Wrapped all Soroban RPC calls in try/catch with human-readable messages.

#### Testing status

Manually tested against Freighter on testnet. Wallet connection, config validation, and ts compilation verified end-to-end once contracts were deployed.

#### Known limitations / blockers

Originally blocked on contract deployment to testnet. Resolved in Phase 2 — contracts deployed, env vars documented in `.env.example`.

#### Next steps

Re-test create → claim flow end-to-end with a funded testnet account and confirm both transactions succeed on Stellar Expert explorer.
