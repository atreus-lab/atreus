# Atreus Backend

API service for the Atreus protocol on Stellar — manages payment link creation, state, and Soroban contract interaction.

## Features

- **REST API** — Create, query, and claim payment links
- **Soroban Integration** — Submit transactions to Stellar smart contracts
- **ZK Proof Relay** — Accept and forward zero-knowledge proofs for verification
- **Logging** — Structured logging with Pino

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript |
| Blockchain | Stellar / Soroban |
| SDK | `@stellar/stellar-sdk` |
| Logging | Pino |

## Getting Started

```bash
pnpm install
pnpm dev
```

Server runs on [http://localhost:3001](http://localhost:3001).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/links` | Create a new payment link |
| `GET` | `/api/links/:hash` | Get link details |
| `POST` | `/api/links/:hash/claim` | Claim funds from a link |

## Project Structure

```
src/
├── index.ts          # Express server entry
├── routes/
│   └── links.ts      # Payment link CRUD routes
└── lib/
    └── stellar.ts    # Stellar SDK configuration
```

## Environment

Copy `.env.example` to `.env` and configure:

```
PORT=3001
HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=testnet
CONTRACT_ID=...
```

## License

MIT
