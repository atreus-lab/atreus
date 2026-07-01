# Frontend Walkthrough

## 1 — Poseidon → SHA256 Pivot

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

## 7 — ZK Scripts (Phase 2)

| Script | Status | What it does |
|--------|--------|-------------|
| `compile-circuit.mjs` | ✅ Works | Compiles Noir circuit via `@noir-lang/noir_wasm` |
| `prove-circuit.mjs` | ❌ Crashes on Windows | UltraHonk proof via `@aztec/bb.js` |
| `verify-pedersen.mjs` | ✅ Confirmed | bb.js Pedersen matches Noir at hashIndex=0 |
| `verify-poseidon.mjs` | ✅ Diagnostic | Confirmed poseidon-lite ≠ Noir Poseidon2 |
