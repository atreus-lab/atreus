# Atreus Backend

Express API service — the ZK attestation-oracle for the Atreus protocol.

Verifies real UltraHonk ZK proofs off-chain and submits signed on-chain attestations
that `claim_link` requires before releasing escrow funds.

## What's Implemented

| Endpoint | Status | What it does |
|----------|--------|-------------|
| `GET /health` | ✅ Working | Returns `{ status: "ok", timestamp }` |
| `POST /api/links` | ⏳ Stub | Generates fake link object with UUID |
| `GET /api/links/:hash` | ⏳ Stub | Returns placeholder data |
| `POST /api/links/:hash/attest` | ✅ **Real** | ZK attestation-oracle (see below) |

## ZK Attestation-Oracle Flow

`POST /api/links/:hash/attest` body: `{ recipient, secret (hex), proof (hex) }`

1. **Validate:** `sha256(secret) == hash` path param — confirms secret matches the link
2. **Recompute:** expected public inputs server-side (`secretToField`, `addressToField`, Pedersen hash) — never trusts client-supplied values
3. **Verify:** `UltraHonkBackend.verifyProof(proof, recomputed_public_inputs)` — real cryptographic check
4. **Attest:** signs + submits `VerifierContract.attest(attester, link_hash, recipient)` on Stellar testnet
5. **Return:** `{ success: true, hash, recipient, attestationTx: "<tx_hash>" }`

After attestation, `claim_link` on `AtreusContract` can proceed — it cross-contract calls
`VerifierContract.is_attested(link_hash, recipient)` and will panic if it returns false.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Language | TypeScript |
| ZK (proof verify) | `@aztec/bb.js@5.0.0-nightly.20260522` (exact pin — matches Noir 1.0.0-beta.22) |
| ZK (witness exec) | `@noir-lang/noir_js@1.0.0-beta.22` |
| Blockchain SDK | `@stellar/stellar-sdk@^16.0.1` |
| Logging | Pino + pino-pretty |

## Getting Started

```bash
# From repo root (pnpm workspace — don't run npm inside backend/)
pnpm --filter atreus-backend install

# Copy and fill in .env
cp backend/.env.example backend/.env
# Set ATTESTER_SECRET_KEY, NEXT_PUBLIC_CONTRACT_ID, NEXT_PUBLIC_VERIFIER_CONTRACT_ID

# Start dev server (loads .env automatically)
pnpm --filter atreus-backend dev    # localhost:3001

# Or from the backend/ directory:
npx tsx --env-file=.env src/index.ts
```

## Environment Variables

```env
PORT=3001

# Attester keypair (dedicated funded testnet account)
ATTESTER_PUBLIC_KEY=GDH55G3I7YXBAYU5EEV2ANV5PEULLGXZYL6P6BMTIZ6QZPERPOVH7GUG
ATTESTER_SECRET_KEY=<secret>      # gitignored — never commit

# Must match frontend/.env.local
NEXT_PUBLIC_CONTRACT_ID=CCZSFPZ6XPZBUPBGQ5FRP5BMW5HKZIZNCWPLJAHNOWP4ZI7BZSMJDTCD
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CB3GJLFAGH2WQTQHSMAB7GABK4NC5Q74XDV2U7MWAYEKQV7YMBV2O7KD
```

## Project Structure

```
backend/
├── .env                    # Gitignored — real secrets (attester keypair)
├── .env.example            # Template — no secrets
├── package.json
├── tsconfig.json
├── scripts/
│   └── test-attestation.mjs  # E2E smoke test: real proof gen → attest → verify on-chain
└── src/
    ├── index.ts            # Express entry point (port 3001)
    ├── routes/
    │   └── links.ts        # /api/links routes incl. /attest
    └── lib/
        ├── zk.ts           # Proof verification (UltraHonk, Pedersen, field encoding)
        └── stellar.ts      # submitAttestation() — signs + submits on-chain attestation
```

## Running the E2E Smoke Test

```bash
# Requires backend dev server running on :3001
node --env-file=backend/.env backend/scripts/test-attestation.mjs
```

Expected output:
- Real 14,656-byte UltraHonk proof generated
- Local verification: `true`
- Response: `{ success: true, attestationTx: "<hash>" }`
- `stellar contract invoke ... is_attested` returns `true`

## Why a Backend Attester?

Noir + Barretenberg produces UltraHonk proofs over BN254. Soroban has native pairing
checks for BLS12-381 (CAP-0059, live) but not BN254 (CAP-0074, proposed). So the proof
is verified off-chain by this service instead. This is Stellar's own recommended interim
pattern — documented trust assumption, not a workaround. Once CAP-0074 ships, a native
BN254 verifier can replace this backend entirely.

## License

MIT
