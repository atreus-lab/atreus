# Atreus Backend

Express API service for the Atreus protocol. **Currently a stub** — cut from MVP scope. Frontend calls Soroban directly via Freighter.

## What's Implemented

| Endpoint | Status | What it does |
|----------|--------|-------------|
| `GET /health` | ✅ Working | Returns `{ status: "ok", timestamp }` |
| `POST /api/links` | ⏳ Stub | Generates fake link object with UUID, returns 201 |
| `GET /api/links/:hash` | ⏳ Stub | Returns hardcoded mock data |
| `POST /api/links/:hash/claim` | ⏳ Stub | Validates recipient+proof present, returns `{ success: true }` |

**No actual Soroban contract interaction** — all endpoints return mock/placeholder data.

## Why It Was Cut

The MVP frontend calls Soroban directly via Freighter wallet (no backend relay needed). The Express server exists as a foundation for:
- Link history and analytics
- Transaction relay for non-Freighter users
- Server-side proof generation (Phase 2)
- Rate limiting and abuse prevention

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Framework | Express 4 |
| Language | TypeScript |
| Blockchain SDK | `@stellar/stellar-sdk` ^12.1.0 |
| Logging | Pino + pino-pretty |
| Testing | Vitest |

## Getting Started

```bash
pnpm install
pnpm dev        # localhost:3001
pnpm build      # tsc compilation
pnpm lint       # tsc --noEmit (type checking)
```

## Project Structure

```
src/
├── index.ts          # Express server entry (31 lines)
├── routes/
│   └── links.ts      # Link CRUD routes — all stubs (52 lines)
└── lib/
    └── stellar.ts    # Stellar SDK config (6 lines)
```

## Environment

```env
PORT=3001
HORIZON_URL=https://horizon-testnet.stellar.org
```

## License

MIT
