# Backend Walkthrough

## 1 — Status: CUT from MVP

**Decision date:** 2026-07-02
**Reason:** Frontend calls Soroban + Horizon directly via `@stellar/stellar-sdk` v16. No backend relay needed.

The backend directory contains Express API stubs that are **not used** in the current MVP. All wallet features (dashboard, send, receive, swap, assets, create/claim links) work entirely client-side using localStorage keypair signing + direct RPC calls.

## 2 — What Exists (pre-ZK pivot)

### Express Server
**File:** `backend/src/index.ts` (31 lines)

- `helmet()` — security headers
- `cors()` — cross-origin requests
- `express.json()` — JSON body parsing
- `pino` logging with `pino-pretty`
- `GET /health` — health check
- Routes mounted at `/api/links`
- Port 3001

### Link Routes (pre-pivot stubs)
**File:** `backend/src/routes/links.ts`

| Method | Path | Implementation |
|--------|------|---------------|
| `POST /` | `/api/links` | Generates UUID, returns fake link object |
| `GET /:hash` | `/api/links/:hash` | Returns hardcoded mock data |

All pre-pivot endpoints had `// TODO` comments — not wired to real Soroban contracts.

### Stellar Config (original)
**File:** `backend/src/lib/stellar.ts` (6 lines at that time)

Exported `HORIZON_URL`, `server`, `networkPassphrase`, `nativeAsset` only.

**Note:** Originally used `@stellar/stellar-sdk@^12.1.0` (frontend uses ^16.0.1). Version mismatch existed.

## 3 — Why It Was Cut

- **No Freighter needed** — all signing is client-side with localStorage keypair
- **Soroban RPC is public** — no API key needed for testnet
- **Horizon API is public** — balances, transactions, trustlines all read directly
- **No private key relay** — keys never leave the browser
- Frontend calls Soroban + Horizon directly via `wallet.ts` and `stellar.ts`

---

## 4 — ZK Attestation-Oracle (B6, 2026-07-02)

**What changed:** The backend is now fully implemented as the ZK attestation-oracle service.
This is not a stub — it verifies real UltraHonk proofs off-chain and submits signed on-chain
attestations that `claim_link` requires before releasing funds.

### Dependencies added

| Package | Version | Purpose |
|---------|---------|---------|
| `@aztec/bb.js` | `5.0.0-nightly.20260522` (exact) | Real UltraHonk proof verification |
| `@noir-lang/noir_js` | `1.0.0-beta.22` | Noir witness execution (for Pedersen hashing) |
| `@stellar/stellar-sdk` | `^16.0.1` (bumped from `^12.1.0`) | XDR parse error with v12 on current testnet protocol |

**Why exact bb.js pin:** `5.0.0-nightly.20260522` is what Noir `1.0.0-beta.22`'s own `install_bb.sh`
pins Barretenberg to. Any other version causes proof verification to fail silently or crash.

**Why stellar-sdk bump to v16:** `^12.1.0` threw `Bad union switch: 4` (XDR parse error) when
calling `rpcServer.getTransaction()` against the current testnet protocol. The frontend was
already on v16; bumping to match fixed it.

### Files created/modified

#### `backend/src/lib/zk.ts` (new)

Core field-encoding + proof-verification logic:

| Export | What it does |
|--------|-------------|
| `FR_ORDER` | BN254 scalar field order (used for both frontend and backend encoding) |
| `secretToField(bytes)` | `BigInt('0x'+hex) % FR_ORDER` |
| `addressToField(stellarAddr)` | `BigInt('0x'+hex(rawPubkey)) % FR_ORDER` |
| `sha256Hex(bytes)` | Node crypto sha256, returns hex string |
| `pedersenHashField(inputs[])` | `BarretenbergSync.pedersenHash(hashIndex=0)` |
| `expectedPublicInputs(secretBytes, recipient)` | Recomputes `[recipientField, linkHashField, nullifierField]` from raw secret |
| `verifyClaimProof(bytecode, proof, secret, recipient)` | Full UltraHonk verification against server-recomputed public inputs |

**Critical design:** Public inputs are recomputed server-side from the raw secret (which the
server already validates via sha256 anyway). The backend never trusts client-supplied public
inputs — this closes the "verify the proof but not the statement" pitfall from the ZK skill docs.

**hashIndex=0:** Confirmed by `frontend/scripts/verify-pedersen.mjs` to match Noir's
`std::hash::pedersen_hash` bit-for-bit. Hard-coded as `PEDERSEN_HASH_INDEX = 0`.

#### `backend/src/lib/stellar.ts` (extended)

Added `submitAttestation(linkHash: Uint8Array, recipient: string): Promise<string>`:
1. Reads `NEXT_PUBLIC_VERIFIER_CONTRACT_ID` + `ATTESTER_SECRET_KEY` from env
2. Builds `VerifierContract.attest(attester, link_hash, recipient)` contract call
3. Prepares, signs, submits via `rpcServer.prepareTransaction` + `tx.sign(attesterKp)`
4. Polls `rpcServer.getTransaction(hash)` until `SUCCESS` or `FAILED` (30s timeout)
5. Returns the on-chain transaction hash

#### `backend/src/routes/links.ts` (extended)

Added real `POST /api/links/:hash/attest`:
1. Validates `sha256(secret) == hash` path param
2. Calls `verifyClaimProof()` — real UltraHonk verification
3. On success: calls `submitAttestation()` — signed on-chain attestation
4. Returns `{ success: true, hash, recipient, attestationTx }`

#### `backend/package.json` (modified)

Added `--env-file=.env` to the `dev` script so Node loads the `.env` file automatically
(Node 20's built-in flag, no dotenv dependency needed):
```json
"dev": "tsx watch --env-file=.env src/index.ts"
```

### Attester keypair

Fresh testnet keypair generated and friendbot-funded:
- Public: `GDH55G3I7YXBAYU5EEV2ANV5PEULLGXZYL6P6BMTIZ6QZPERPOVH7GUG`
- Secret: stored in `backend/.env` as `ATTESTER_SECRET_KEY` (gitignored, never committed)
- This same address was passed as the `attester` arg to `VerifierContract.__constructor` at deploy time

### E2E smoke test (confirmed working)

**File:** `backend/scripts/test-attestation.mjs`

Test run output (successful):
```
Proof generated! Byte length: 14656
Local verified: true
Response status: 200
{ success: true, attestationTx: "83df8a66..." }

stellar contract invoke ... is_attested → true
```

Full flow proven:
- Random 32-byte secret → sha256 link_hash
- Random Stellar recipient
- Noir witness execution → real UltraHonk proof (14,656 bytes)
- Local verification: `true`
- Backend recomputes public inputs independently → verifies proof
- On-chain attestation submitted → `is_attested` returns `true`
