# Contributing to Atreus

We welcome contributions — code, tests, docs, UX feedback, or bug reports.

## Community

Join our Telegram: https://t.me/+nmkyaWZ8Xx5jZDM0

## Getting Started

```bash
git clone https://github.com/atreus-lab/atreus
cd atreus/frontend
pnpm install
pnpm run dev
```

See the [README](./README.md) for full setup instructions, prerequisites, and per-package commands.

## How to Contribute

### 1. Find an Issue

Check the [issues tab](https://github.com/atreus-lab/atreus/issues) for open tasks. Issues are labeled by area and complexity:

| Label | What it means |
|-------|---------------|
| `good first issue` | Small scope, no blockchain knowledge required. Docs, test coverage, frontend polish. |
| `intermediate` | Full feature work in frontend or backend. React/Next.js/Express experience expected. |
| `advanced` | Contract logic, Noir circuit changes, or bb.js integration. Rust/Soroban/Noir domain knowledge required. |

If nothing fits, open an issue describing what you'd like to work on.

### 2. Read the Walkthrough

Each package has a walkthrough that explains its architecture and key files:

- [Frontend](./frontend/walkthrough/allwalkthrough.md)
- [Contracts](./contracts/walkthrough/allwalkthrough.md)
- [Circuits](./circuits/walkthrough/allwalkthrough.md)
- [Backend](./backend/walkthrough/allwalkthrough.md)

Reading the relevant walkthrough before starting will save you time.

### 3. Set Up Your Environment

**Frontend only:**
```bash
cd frontend
pnpm install
cp .env.example .env.local   # edit with testnet values
pnpm run dev                  # http://localhost:3000
```

**Contracts (Rust):**
```bash
cd contracts
cargo test -p atreus-contract
```

**Circuits (Noir via Docker):**
```bash
docker compose run --rm test
```

All contract interactions use **Stellar testnet** — no real funds involved.

### 4. Open a Pull Request

- Open a **draft PR** early for feedback, even if incomplete.
- Ensure **CI passes** (lint, typecheck, tests).
- Include tests for new functionality.
- Follow the existing code style — match imports, naming, and patterns used in neighboring files.
- Keep PRs focused on a single issue.

### 5. Review

Maintainers review PRs within:

| Size | Target |
|------|--------|
| Small (< 50 lines) | 48 hours |
| Medium | 72 hours |
| Large | 1 week |

Reviews focus on correctness, security (especially for contract changes), and architectural fit.

## Code Conventions

- **No comments unless the code cannot be made self-documenting.** The codebase avoids explanatory comments in favor of clear naming and structure.
- **Match existing patterns.** Before writing new code, look at the imports and conventions in the files you're modifying.
- **No emoji in code or docs.**
- **All secrets and keys stay out of git.** Never commit `.env` files, private keys, or API tokens.

## Project Structure

```
atreus/
├── frontend/          Next.js 15 — wallet UI + payment links
├── backend/           Express — ZK attestation-oracle API
├── contracts/         Soroban smart contracts (Rust)
├── circuits/          Noir ZK circuit (Pedersen hash)
├── scripts/           Utility scripts
└── docs/              Architecture docs (may be stale)
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
