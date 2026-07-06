# Atreus Backend

Express API service — the ZK attestation oracle for the Atreus protocol.

Verifies UltraHonk ZK proofs off-chain and submits signed on-chain attestations that the escrow contract requires before releasing funds.

## Endpoints

| Endpoint | What it does |
|----------|-------------|
| `GET /health` | Health check — returns `{ status: "ok", timestamp }` |
| `POST /api/links/:hash/attest` | Verifies a ZK proof and submits an on-chain attestation |

## Attestation Flow

`POST /api/links/:hash/attest` — body: `{ recipient, secret (hex), proof (hex) }`

1. **Validate** — confirms `sha256(secret) == hash`
2. **Recompute** — computes expected public inputs server-side (never trusts client-supplied values)
3. **Verify** — runs `UltraHonkBackend.verifyProof(proof, public_inputs)` for cryptographic verification
4. **Attest** — signs and submits `VerifierContract.attest(attester, link_hash, recipient)` on Stellar testnet
5. **Return** — `{ success: true, hash, recipient, attestationTx: "<tx_hash>" }`

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Language | TypeScript |
| ZK (proof verify) | `@aztec/bb.js@5.0.0-nightly.20260522` |
| ZK (witness exec) | `@noir-lang/noir_js@1.0.0-beta.22` |
| Blockchain SDK | `@stellar/stellar-sdk@^16.0.1` |
| Logging | Pino + pino-pretty |

## Getting Started

```bash
# Install
pnpm --filter atreus-backend install

# Configure
cp backend/.env.example backend/.env
# Set ATTESTER_SECRET_KEY, contract IDs, RPC URLs

# Start dev server
pnpm --filter atreus-backend dev    # localhost:3001
```

## Environment Variables

```env
PORT=3001
ATTESTER_PUBLIC_KEY=GDH55G3I7YXBAYU5EEV2ANV5PEULLGXZYL6P6BMTIZ6QZPERPOVH7GUG
ATTESTER_SECRET_KEY=<secret>
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_CONTRACT_ID=CCZSFPZ6XPZBUPBGQ5FRP5BMW5HKZIZNCWPLJAHNOWP4ZI7BZSMJDTCD
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD
```

## Project Structure

```
backend/
├── scripts/
│   └── test-attestation.mjs    # E2E smoke test
└── src/
    ├── index.ts                 # Express entry point
    ├── routes/
    │   └── links.ts             # /api/links routes
    └── lib/
        ├── zk.ts                # Proof verification (UltraHonk, Pedersen, field encoding)
        └── stellar.ts           # submitAttestation() — signs + submits on-chain attestation
```

## E2E Smoke Test

```bash
# Requires backend dev server running on :3001
node --env-file=backend/.env backend/scripts/test-attestation.mjs
```

Expected output:
- Real 14,656-byte UltraHonk proof generated
- Local verification: `true`
- Response: `{ success: true, attestationTx: "<hash>" }`
- `stellar contract invoke ... is_attested` returns `true`

## License

MIT
