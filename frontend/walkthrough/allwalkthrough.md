# Frontend Walkthrough

## 1 — Complete Project Status

**Last updated:** 2026-07-02
**Branch:** `feat/wallet-swap-assets-fixes` (PR #20, conflict-free after merge)

### What works (✅ — Direct Stellar/Horizon API, no backend needed):
| Feature | Status | How |
|---------|--------|-----|
| Wallet creation | ✅ | BIP39 mnemonic → Ed25519 keypair → localStorage |
| Google Sign-In | ✅ | OAuth 2.0 via `@react-oauth/google`, email stored |
| Restore from seed | ✅ | BIP39 mnemonic validation + recovery |
| Send XLM | ✅ | Direct `Operation.payment()` signed with keypair |
| Receive | ✅ | Copy address, explorer link |
| Swap (DEX) | ✅ | `pathPaymentStrictSend` with auto-trustline |
| Add Assets | ✅ | `Operation.changeTrust()` for any asset |
| Dashboard | ✅ | Balance, all assets, tx history from Horizon API |

### What needs contracts (❌ — depends on deployed Soroban contracts):
| Feature | Status | Why |
|---------|--------|-----|
| Create Link | Needs test | `AtreusContract.create_link()` must be live |
| Claim Link | Needs test | `VerifierContract.submit_proof()` + `claim_link()` |
| ZK Proofs | ❌ Blocked | bb.js crashes on all platforms with Pedersen |

## 2 — Wallet Architecture (BIP39 + OAuth)

**File:** `frontend/src/lib/wallet.ts` (211 lines)

### Keypair derivation:
```
bip39.generateMnemonic(256) → 24-word mnemonic
  → bip39.mnemonicToSeed(mnemonic) → 64-byte seed
    → Keypair.fromRawEd25519Seed(seed[0..32]) → Stellar keypair
```

### Wallet storage:
```typescript
interface StoredWallet {
  publicKey: string;   // Stellar G... address
  secretKey: string;   // Ed25519 secret key
  mnemonic: string;    // 24-word BIP39 recovery phrase
  email?: string;      // From Google OAuth (optional)
}
```

Stored in `localStorage` key `atreus_wallet`. Cleared on "Remove Wallet".

### Authentication options:
| Method | Description |
|--------|-------------|
| Google Sign-In | `useGoogleLogin()` → fetch email → `generateWallet(email)` |
| Anonymous | `generateWallet()` — no email, just keypair |
| Restore | `restoreFromMnemonic(phrase)` — validates + recovers |

### Key differences from v1 (Freighter):
| v1 (Old) | v2 (Current) |
|----------|-------------|
| `Keypair.random()` — no recovery | `bip39.generateMnemonic()` — 24 words |
| Freighter browser extension | Direct `tx.sign(kp)` with secret key |
| `signTransaction(xdr)` from freighter | `tx.sign(getKeypair())` |
| Freighter for create/claim too | All signing via localStorage keypair |

## 3 — Google OAuth Integration

**Files:**
- `frontend/src/app/layout.tsx` — wraps app in `GoogleOAuthProvider`
- `frontend/src/app/wallet/page.tsx` — `useGoogleLogin()` hook
- `frontend/.env.example` — `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**Flow:**
1. User clicks "Sign in with Google"
2. Google OAuth popup → returns `access_token`
3. Fetch email: `GET https://www.googleapis.com/oauth2/v3/userinfo`
4. Create wallet with email association
5. Email displayed on dashboard

**Env setup:**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## 4 — Wallet Page

**File:** `frontend/src/app/wallet/page.tsx` (226 lines)

**States:**
| View | Description |
|------|-------------|
| `create` | 3 buttons: Google Sign-In, Anonymous, Restore |
| `restore` | Textarea for 24-word seed phrase + Restore button |
| `ready` | Address, balance, mnemonic (show/hide/copy), email, Go to Dashboard |

**Mnemonic UI:**
- Grid layout with numbered words (`.mnemonic-grid`, `.mnemonic-word`)
- Show/Hide toggle (Eye/EyeOff icons)
- Copy to clipboard (Copy/Check icons)
- Warning text: "Save these 24 words somewhere safe"

## 5 — Create Link Page

**File:** `frontend/src/app/create/page.tsx` (101 lines)

**Flow:**
1. User enters amount (XLM)
2. Clicks "Generate Link" → `connectWallet()` (now uses localStorage wallet, not Freighter)
3. Generates 32 random bytes via `crypto.getRandomValues(new Uint8Array(32))`
4. Computes `linkHash = SHA-256(secretBytes)` via Web Crypto API
5. Calls `createEscrowTx(creator, amount, linkHash)`:
   - `xlmToStroops(amount)` — BigInt-based conversion
   - `waitForTransaction(hash)` — polls Soroban RPC until confirmed
6. Constructs URL: `/claim#<secretHex>` — secret never sent to server
7. Displays link with copy-to-clipboard button

**Key detail:** URL fragment (`#`) means secret stays client-side only.

## 6 — Claim Link Page

**File:** `frontend/src/app/claim/page.tsx` (86 lines)

**Flow:**
1. Reads `secretHex` from `window.location.hash` on mount
2. User clicks "Claim with ZK Proof"
3. Parses hex → `Uint8Array` (32 bytes)
4. Computes `linkHash = SHA-256(secretBytes)`
5. **Step 1:** `submitProofTx(recipient, mockProof)` → VerifierContract (2144-byte proof receipt)
6. **Step 2:** `claimLinkTx(recipient, linkHash, secret)` → AtreusContract (SHA-256 fallback)
7. Shows success message

**States:** `idle` → `connecting` → `submitting_proof` → `claiming` → `success` / `error`

**Mock proof:** 2144 random bytes from `frontend/src/lib/proof.ts`. Real UltraHonk proof generation blocked (bb.js crashes).

## 7 — Dashboard Page

**File:** `frontend/src/app/dashboard/page.tsx` (181 lines)

**Features:**
1. **Header** — "Wallet" title + Refresh button + Log Out (switch wallet)
2. **Balance** — XLM balance in monospace, truncated address + explorer link
3. **Quick Actions** — 4 grid items: Send, Receive, Link (create), Swap
4. **Assets** — All balances with "Add Asset" link to `/assets`
5. **Recent Activity** — Last 5 payments with sent/received coloring, explorer links
6. **Nav** — Home + Claim Link links

**Auto-refresh:** Fetches fresh data on page focus (`window.addEventListener("focus")`).

## 8 — Send Page

**File:** `frontend/src/app/send/page.tsx` (91 lines)

**Flow:**
1. Enter destination `G...` address + XLM amount
2. Validates balance (includes fee buffer)
3. Signs with localStorage keypair: `tx.sign(kp)` → `rpcServer.sendTransaction()`
4. Shows explorer link on success

**States:** `idle` → `sending` → `success` / `error`

## 9 — Receive Page

**File:** `frontend/src/app/receive/page.tsx` (61 lines)

Shows wallet address + "Copy Address" button + Stellar Expert explorer link.

## 10 — Swap Page

**File:** `frontend/src/app/swap/page.tsx` (90 lines)

**Flow:**
1. Select destination token (USDC `GA2BYV...` or EURT `GBLETQ...`)
2. Enter XLM amount (2% slippage buffer)
3. **Auto-trustline:** Checks `hasTrustline()`, adds via `Operation.changeTrust()` if missing
4. Executes `pathPaymentStrictSend` via Stellar DEX
5. Signs with localStorage keypair

**States:** `idle` → `swapping` → `success` / `error`

## 11 — Assets Page

**File:** `frontend/src/app/assets/page.tsx` (148 lines)

**Features:**
- Common assets (USDC, EURT) with per-asset loading state
- Custom asset input (code + issuer)
- Lists current balances

## 12 — Stellar SDK Integration

**File:** `frontend/src/lib/stellar.ts` (267 lines)

### Key changes from v1:
- ❌ **No Freighter** — completely removed `@stellar/freighter-api`
- ❌ No `signTransaction()` calls — all signing via `getKeypair()` from wallet.ts
- ✅ `connectWallet()` reads from localStorage instead of opening Freighter popup
- ✅ `waitForTransaction()` — polls Soroban RPC for on-chain confirmation
- ✅ `xlmToStroops()` — BigInt-based stroop conversion

### Functions:
| Function | Params | Purpose |
|----------|--------|---------|
| `connectWallet()` | — | Returns public key from localStorage wallet |
| `xlmToStroops(amount)` | string → bigint | Decimal string → stroops (no float errors) |
| `waitForTransaction(hash)` | string → result | Polls Soroban RPC until SUCCESS/FAILED |
| `createEscrowTx(creator, amount, hash)` | string, string, Uint8Array → hash | Builds + signs + submits `create_link` via Soroban |
| `claimLinkTx(recipient, linkHash, secret)` | string, Uint8Array, Uint8Array → hash | Submits `claim_link` via Soroban |
| `submitProofTx(recipient, proof)` | string, Uint8Array → hash | Submits mock proof to VerifierContract |
| `sendXLM(sender, destination, amount)` | string, string, string → hash | Native XLM transfer via Horizon |
| `swapXLM(sender, destAsset, destAmount)` | string, Asset, string → hash | DEX path payment with simulation |
| `findSwapPath(source, dest, amount)` | Asset, Asset, string → path | Discover DEX liquidity paths |
| `getAccountBalances(address)` | string → Balance[] | All assets via Horizon |
| `getRecentTransactions(address, limit)` | string, number → Transaction[] | Last N payments |

## 13 — Design System

**File:** `frontend/src/app/globals.css` (364 lines)

### CSS Custom Properties:
| Variable | Value | Usage |
|----------|-------|-------|
| `--background-primary` | `#020617` | Page background |
| `--background-card` | `#0f172a` | Card backgrounds |
| `--foreground-primary` | `#f8fafc` | Body text |
| `--accent-primary` | `#3b82f6` | Buttons, links, focus rings |
| `--success` | `#22c55e` | Success states |
| `--error` | `#f87171` | Error states |

### Semantic classes (30+):
| Class | Purpose |
|-------|---------|
| `.page`, `.page-content` | Page layout |
| `.card`, `.card-title`, `.card-body`, `.card-flush` | Card component |
| `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-claim` | Buttons |
| `.input`, `.input-label` | Form inputs |
| `.status-error`, `.status-success`, `.success-banner` | Status messages |
| `.icon-sm`, `.icon-md`, `.icon-lg`, `.icon-spin` | Icon sizing |
| `.content-area`, `.content-wide`, `.content-narrow` | Width constraints |
| `.flex-row`, `.flex-between`, `.flex-center-row`, `.flex-col-center` | Layout |
| `.action-grid`, `.action-item` | Dashboard action grid |
| `.nav-row` | Navigation |
| `.back-link` | Back to dashboard |
| `.balance-value` | Large balance number |
| `.mono-text`, `.font-mono-text` | Monospace text |
| `.detail-text`, `.text-small` | Secondary text |
| `.inner-space`, `.inner-space-sm` | Spacing |
| `.divider`, `.divider-hr`, `.divider-line` | Dividers |
| `.link-preview` | Shareable link box |
| `.swap-pair`, `.swap-select` | Swap UI |
| `.tx-amount-sent`, `.tx-amount-received` | Transaction coloring |
| `.mnemonic-grid`, `.mnemonic-word`, `.mnemonic-index` | Seed phrase display |
| `.btn-icon`, `.btn-icon-lg` | Icon-only buttons |
| `.inline-link` | Inline block link |
| `.card-padding` | Card child padding |

### Typography: Manrope (headings) + Inter (body) via `next/font/google`

## 14 — Env Variables

**File:** `frontend/.env.example`

```env
NEXT_PUBLIC_CONTRACT_ID=CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB
NEXT_PUBLIC_TOKEN_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 15 — Known Issues

- ~~bb.js UltraHonk crashes on ALL platforms~~ — **FIXED**: was a version-pin bug (`^4.4.0` instead of exact `5.0.0-nightly.20260522`). Real proof gen now works.
- Soroban has no BN254 host functions (CAP-0074 proposed) — on-chain UltraHonk verification still not possible; attestation-oracle pattern used instead
- `/docs/architecture.md` and `/docs/design.md` are stale (not updated)
- Testnet has limited DEX liquidity — swap may fail for some token pairs
- Google OAuth needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set in env
- Browser-side proof generation uses WASM — first load takes ~5–10s on cold start

## 16 — Phase 2: ZK Proof Chain Reaction (historical)

**Date:** 2026-07-01
**Reason:** bb.js UltraHonk proof generation believed to fail on all environments. Pivot to architecture demo.

**Files created:**
- `frontend/src/lib/proof.ts` — mock 2144-byte UltraHonk proof + `hexToBytes()` helper

### Claim flow (2 transactions, old):
1. **submitProofTx()** — VerifierContract `submit_proof()` with mock proof bytes
2. **claimLinkTx()** — AtreusContract `claim_link()` with SHA-256 secret (fallback)

> This phase was superseded by Part 17. The "crash" was a version-pin bug, not a platform issue.

---

## 17 — Real ZK Claim Flow (B7, 2026-07-02)

**What changed:** The claim page now generates a real UltraHonk ZK proof client-side,
sends it to the backend attester for off-chain verification + on-chain attestation, and
then calls `claim_link` — which is now gated on that attestation existing on-chain.

### Root cause of the "bb.js crash" resolved

The previous "crashes on all platforms" belief was wrong. The real issue: `frontend/package.json`
had `@aztec/bb.js@^4.4.0`, but the Noir circuit was compiled with `1.0.0-beta.22`, whose own
`install_bb.sh` pins Barretenberg to **`5.0.0-nightly.20260522`**. Pinning to the exact version
fixes it — real 14,656-byte UltraHonk proofs are generated and verified. See
`contracts/walkthrough/allwalkthrough.md` Part 9 for the discovery details.

### Files created/modified

#### `frontend/src/lib/zk.ts` (new)

Client-side ZK proof generation module:

| Export | What it does |
|--------|-------------|
| `generateClaimProof(secretBytes, recipient)` | Full proof generation pipeline — returns `{ proof: Uint8Array, linkHashHex: string }` |
| `requestAttestation(linkHashHex, secretHex, proofHex, recipient)` | POSTs to backend, returns `attestationTx` hash |

**Proof generation pipeline inside `generateClaimProof`:**
1. `secretToField(secretBytes)` — `BigInt('0x'+hex) % FR_ORDER`
2. `addressToField(recipient)` — `BigInt('0x'+hex(rawPubkey)) % FR_ORDER`  
3. `BarretenbergSync.pedersenHash(hashIndex=0)` for `link_hash` and `nullifier`
4. `Noir.execute({ secret, recipient, link_hash, nullifier })` → witness (404 bytes)
5. `UltraHonkBackend.generateProof(witness)` → 14,656-byte proof
6. SHA-256 of secretBytes via `crypto.subtle.digest` → `linkHashHex`

Dynamic imports used for `@aztec/bb.js` and `@noir-lang/noir_js` (large WASM — only loaded when needed).

**BigInt literals:** Uses `BigInt()` constructor instead of `n` suffix (frontend tsconfig `target: ES2017`
doesn't allow BigInt literals syntactically, though runtime supports BigInt in all modern browsers).

#### `frontend/public/circuits/secret.json` (new)

Copy of `circuits/target/secret.json` so the browser can fetch it via `/circuits/secret.json`.
The Node.js scripts can read from the monorepo path; the browser cannot.

#### `frontend/src/app/claim/page.tsx` (rewritten)

New statuses and flow:

| Status | UI text | What's happening |
|--------|---------|-----------------|
| `idle` | "Claim with ZK Proof" | Ready |
| `connecting` | "Connecting Wallet..." | `connectWallet()` |
| `generating_proof` | "Generating ZK Proof..." | `generateClaimProof()` — real WASM proof gen |
| `attesting` | "Verifying Proof & Attesting..." | `requestAttestation()` → backend → on-chain |
| `claiming` | "Claiming Funds..." | `claimLinkTx()` — contract gated on attestation |
| `success` | "Claimed!" | Shows TX hash + navigation buttons |
| `error` | "Try Again" | Shows error message |

Success state shows "Create Another Link" and "Back to Dashboard" buttons (`.btn-secondary` class).

Removed: `submitProofTx` call, `MOCK_ULTRAHONK_PROOF` import.

#### `frontend/src/lib/proof.ts` (updated)

Removed `MOCK_ULTRAHONK_PROOF` constant (was 2144 bytes of static hex).
Kept `hexToBytes()` utility, added `bytesToHex()` (used to encode proof for HTTP POST).

#### `frontend/src/lib/stellar.ts` (updated)

- `createEscrowTx`: Added balance check before submission. `getNativeBalance()` already existed — added comparison against `amount + 0.01 XLM` (estimated fee), throws friendly error if insufficient.
- `claimLinkTx`: Wrapped `rpcServer.getAccount(recipient)` in try/catch — throws "Recipient account isn't funded on testnet" instead of opaque RPC failure.
- `submitProofTx`: Removed (replaced by attestation-oracle pattern). Left a comment explaining why.

#### `frontend/.env.local` + `frontend/.env.example` (updated)

Added `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001` — new required variable for the
attestation POST endpoint. (The `.env.example`'s `GOOGLE_CLIENT_SECRET` placeholder line was not touched.)

### Build verification

`npx next build` in `frontend/` — clean pass, all 12 routes, no TS errors.

Fixes applied during build:
1. `BigInt literal not available below ES2020` — replaced `n` suffix with `BigInt()` constructor
2. `Uint8Array not assignable to BufferSource` — cast `new Uint8Array(secretBytes) as unknown as ArrayBuffer`

---

## Appendix: Historical Entries

### Issue #6 — Wire Create Link page to real Stellar/Soroban

**Date:** 2026-07-01
**Author:** temycodes

**Files touched:**
- `frontend/src/app/create/page.tsx`
- `frontend/src/lib/stellar.ts`

#### What changed

The `/create` page now performs the full real flow:
1. Connects wallet (originally Freighter, now localStorage wallet)
2. Generates secret → SHA-256 hash (originally Poseidon, later replaced)
3. Builds + submits `create_link()` via Soroban RPC
4. Polls for on-chain confirmation via `waitForTransaction()`
5. Derives `/claim#<secret>` URL

#### Key implementation details

**Transaction confirmation polling.** Added `waitForTransaction()` — polls `rpcServer.getTransaction(hash)` until SUCCESS/FAILED (30s timeout).

**Stroop conversion.** `xlmToStroops()` — BigInt-based, no floating point errors.

**Error handling.** All RPC calls wrapped in try/catch with human-readable messages.
