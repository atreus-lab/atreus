# Backend Walkthrough

## 1 — Status: CUT from MVP

**Decision date:** 2026-07-02
**Reason:** Frontend calls Soroban + Horizon directly via `@stellar/stellar-sdk` v16. No backend relay needed.

The backend directory contains Express API stubs that are **not used** in the current MVP. All wallet features (dashboard, send, receive, swap, assets, create/claim links) work entirely client-side using localStorage keypair signing + direct RPC calls.

## 2 — What Exists

### Express Server
**File:** `backend/src/index.ts` (31 lines)

- `helmet()` — security headers
- `cors()` — cross-origin requests
- `express.json()` — JSON body parsing
- `pino` logging with `pino-pretty`
- `GET /health` — health check
- Routes mounted at `/api/links`
- Port 3001

### Link Routes (Stubs)
**File:** `backend/src/routes/links.ts` (52 lines)

| Method | Path | Implementation |
|--------|------|---------------|
| `POST /` | `/api/links` | Generates UUID, returns fake link object |
| `GET /:hash` | `/api/links/:hash` | Returns hardcoded `{ hash, creator, amount, claimed: false }` |
| `POST /:hash/claim` | `/api/links/:hash/claim` | Validates `recipient` + `proof`, returns `{ success: true }` |

All endpoints have `// TODO` comments — not wired to real Soroban contracts.

### Stellar Config
**File:** `backend/src/lib/stellar.ts` (6 lines)

Exports `HORIZON_URL`, `server`, `networkPassphrase`, `nativeAsset`.

**Note:** Uses `@stellar/stellar-sdk` ^12.1.0 (frontend uses ^16.0.1). Version mismatch exists.

## 3 — Why It Was Cut

- **No Freighter needed** — all signing is client-side with localStorage keypair
- **Soroban RPC is public** — no API key needed for testnet
- **Horizon API is public** — balances, transactions, trustlines all read directly
- **No private key relay** — keys never leave the browser
- Frontend calls Soroban + Horizon directly via `wallet.ts` and `stellar.ts`

## 4 — Potential Future Use

- Link history and analytics (server-side persistence)
- Transaction relay for non-browser clients
- Server-side proof generation (if bb.js ever works in Node)
- Rate limiting and abuse prevention
- Webhook notifications for claimed/refunded links
