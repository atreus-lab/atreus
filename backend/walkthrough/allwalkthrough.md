# Backend Walkthrough

## 1 — Express API Stub

**What:** Basic Express server with Pino logging, CORS, Helmet.

**Routes:**

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/health` | ✅ Working — returns `{ status: "ok" }` |
| `POST` | `/api/links` | ⏳ Stub — generates fake link, real Soroban integration not wired |
| `GET` | `/api/links/:hash` | ⏳ Stub — returns hardcoded response |
| `POST` | `/api/links/:hash/claim` | ⏳ Stub — accepts recipient+proof, no actual verification |

**Files:** `backend/src/index.ts`, `backend/src/routes/links.ts`, `backend/src/lib/stellar.ts`

## 2 — Current Status

Backend was **cut from MVP scope** — frontend calls Soroban directly via Freighter. The Express server exists as a stub for future use (link history, tx relay for non-Freighter users, analytics).

**TS2742 Fix:** Added explicit type annotations (`app: express.Application`, `linkRoutes: Router`) to fix pnpm-hoisted type inference errors.

**Files:** `backend/src/index.ts`, `backend/src/routes/links.ts`, `backend/src/lib/stellar.ts`
