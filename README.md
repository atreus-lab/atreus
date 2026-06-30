# Atreus

> Google-login wallet with privacy-preserving payment links and programmable ZK rules on Stellar.
> No seed phrase. No identity leak. No double-claim. No proof sniping.

**TL;DR** — Sign in with Google, get a Stellar wallet. Send money with a rule attached: *only wallets holding more than 50 XLM can claim this*. Recipient opens the link, proves the rule with a zero-knowledge proof without revealing their actual balance, gets funds. Asset auto-swaps via Soroswap on the way in.

---

## Monorepo Structure

```
atreus/
├── frontend/     → Next.js 15 web app (create/claim payment links)
├── backend/      → Express API service (link management & tx relay)
├── contracts/    → Soroban smart contracts (escrow + ZK verifier)
├── docs/         → Vision, architecture, milestones, planning, design
├── ARCHITECTURE.md
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

## Repo History

This monorepo was assembled from three separate repos using `git subtree`:
- [`atreus-frontend`](https://github.com/atreus-lab/atreus-frontend) → `frontend/`
- [`atreus-backend`](https://github.com/atreus-lab/atreus-backend) → `backend/`
- [`atreus-contracts`](https://github.com/atreus-lab/atreus-contracts) → `contracts/`

## Docs

All documentation lives in [`docs/`](./docs):

- [Vision](./docs/vision.md)
- [Architecture](./docs/architecture.md)
- [Design System](./docs/design.md)
- [Problem Statement](./docs/problem-statement.md)
- [MVP Scope](./docs/mvp-scope.md)
- [Roadmap](./docs/roadmap.md)
- [Milestones](./docs/milestones.md)
- [ZK Design](./docs/zk-design.md)
- [Demo Flow](./docs/demo-flow.md)
- [SCF Vision](./docs/scf-vision.md)
- [Risk Analysis](./docs/risk-analysis.md)
