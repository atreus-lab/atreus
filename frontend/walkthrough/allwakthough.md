# Frontend Walkthrough

## 1 — Poseidon-lite → Web Crypto SHA256

**What:** Replaced `poseidon-lite` with Web Crypto SHA256. Poseidon (JS) ≠ Poseidon2 (Noir) → different outputs. bb.js WASM crashes on Windows. SHA256 is deterministic, native in browser + Soroban.

**Changes:**
- `create/page.tsx`: `crypto.subtle.digest("SHA-256", secretBytes)` replaces `poseidon1(secretBigInt)`
- `package.json`: removed `poseidon-lite`
- `next.config.js`: Buffer polyfill for `@stellar/stellar-sdk`

## 2 — Create Link Page (`/create`)

**Flow:** Connect Freighter → enter amount → generate 32 random bytes → SHA256 → `createEscrowTx()` → build/sign/submit Soroban tx → URL `#secretHex` → copy button.

**Key:** URL fragment (`#`) — secret never hits server.

## 3 — Claim Link Page (`/claim`)

**Flow:** Parse `#secretHex` from URL → "Claim with Freighter" → connect wallet → parse hex → SHA256 → `claimLinkTx()` → build/sign/submit → success.

**States:** `idle` → `connecting` → `claiming` → `success` / `error`. No ZK proof in MVP — Phase 2 adds UltraHonk proof generation.

## 4 — Stellar SDK (`stellar.ts`)

**Functions:**
- `connectWallet()` — Freighter wallet
- `createEscrowTx(creator, amount, hash)` — create_link call
- `claimLinkTx(recipient, linkHash, secret)` — claim_link call

**Tx flow:** `Contract.call()` → `TransactionBuilder` → `rpcServer.prepareTransaction()` → `signTransaction()` (Freighter) → `rpcServer.sendTransaction()`.

**Files:** `frontend/src/lib/stellar.ts`, `frontend/src/app/create/page.tsx`, `frontend/src/app/claim/page.tsx`
