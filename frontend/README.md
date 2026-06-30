# Atreus Frontend

A **Next.js 15** application for creating and claiming Stellar-based payment links — no recipient wallet required.

Built for [Stellar Hacks & ZK](https://dorahacks.io/hackathon/stellar-hacks-zk/detail) and the Stellar Development Foundation grant.

## Features

- **Create Links** — Escrow funds on Stellar and generate a shareable link
- **Claim Links** — Recipients claim funds via a link using passkey authentication
- **ZK Privacy** — Zero-knowledge proofs (Noir) for private claim verification
- **Passkey Auth** — WebAuthn-based biometric/device authentication
- **Soroban Integration** — Direct interaction with Stellar smart contracts

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Blockchain | Stellar / Soroban |
| SDK | `@stellar/stellar-sdk` |
| ZK | Noir (Nargo) |
| Auth | WebAuthn (Passkeys) |

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
src/
├── app/          # Next.js pages (create, claim, home)
├── components/   # Reusable UI components
├── hooks/        # Custom React hooks
├── lib/          # Stellar SDK & Passkey helpers
├── services/     # API service layer
├── types/        # TypeScript type definitions
└── zk/           # ZK proof generation
```

## Environment

Copy `.env.example` to `.env.local` and configure:

```
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ID=...
```

## License

MIT
