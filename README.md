# Atreus

> Google-login wallet with privacy-preserving payment links and programmable ZK rules on Stellar.
> No seed phrase. No identity leak. No double-claim. No proof sniping.

**TL;DR** — Sign in with Google, get a Stellar wallet. Send money with a rule attached: *only wallets holding more than 50 XLM can claim this*. Recipient opens the link, proves the rule with a zero-knowledge proof without revealing their actual balance, gets funds. Asset auto-swaps via Soroswap on the way in.

---

## Monorepo Structure

```
atreus/
├── frontend/     → Next.js 15 web app (wallet + link create/claim)
├── backend/      → Express API service (link management & tx relay)
├── contracts/    → Soroban smart contracts (escrow + ZK verifier)
├── docs/         → Architecture, design system
├── package.json  → Root workspace config (pnpm)
└── README.md
```

This is a **pnpm monorepo** — all packages live in this repo.

## Getting Started

```bash
pnpm install
pnpm dev          # runs frontend + backend in parallel
pnpm dev:frontend # frontend only (localhost:3000)
pnpm dev:backend  # backend only (localhost:3001)
```

## Packages

| Package    | Tech              | Purpose                          |
| ---------- | ----------------- | -------------------------------- |
| frontend   | Next.js 15        | Wallet UI, link create/claim     |
| backend    | Express + TS      | Link management API, tx relay    |
| contracts  | Rust (Soroban)    | Escrow + ZK verifier contracts   |

## Docs

- [Architecture](./docs/architecture.md) — Single source of truth for the entire system
- [Design System](./docs/design.md) — UI/UX design tokens, components, and conventions
