# Backend Walkthrough

## 1 — Express API Server

**File:** `backend/src/index.ts` (31 lines)

Express server with:
- `helmet()` — security headers
- `cors()` — cross-origin requests
- `express.json()` — JSON body parsing
- `pino` logging with `pino-pretty` colorized output
- Health check at `GET /health`
- Routes mounted at `/api/links`
- Port defaults to 3001

## 2 — Link Routes (Stubs)

**File:** `backend/src/routes/links.ts` (52 lines)

| Method | Path | Status | Implementation |
|--------|------|--------|---------------|
| `POST /` | `/api/links` | ⏳ Stub | Generates UUID, returns fake link object (no Soroban interaction) |
| `GET /:hash` | `/api/links/:hash` | ⏳ Stub | Returns hardcoded `{ hash, creator: "G...", amount: "1000", claimed: false }` |
| `POST /:hash/claim` | `/api/links/:hash/claim` | ⏳ Stub | Validates `recipient` + `proof` present, returns `{ success: true }` |

All endpoints have `// TODO` comments for real implementation.

## 3 — Stellar SDK Config

**File:** `backend/src/lib/stellar.ts` (6 lines)

Exports: `HORIZON_URL` (env or testnet), `server` (Horizon.Server), `networkPassphrase` (TESTNET), `nativeAsset` (Asset.native()).

**Note:** Uses `@stellar/stellar-sdk` ^12.1.0 (frontend uses ^16.0.1 — version mismatch).

## 4 — Why Backend Was Cut

Frontend calls Soroban directly via Freighter wallet. No backend relay needed for MVP. The Express server exists as foundation for:
- Link history and analytics
- Transaction relay for non-Freighter users
- Server-side proof generation (Phase 2)
- Rate limiting and abuse prevention

## 5 — TS2742 Fix

Added explicit type annotations to fix pnpm-hoisted type inference errors:
- `index.ts`: `const app: express.Application = express();`
- `links.ts`: `export const linkRoutes: Router = Router();`
