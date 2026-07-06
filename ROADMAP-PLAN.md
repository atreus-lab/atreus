# Atreus — Roadmap & Plan

## 1. Project Snapshot

```
atreus/
├── frontend/          Next.js 15 — 14 pages, 20 components
├── backend/           Express API — ZK attestation oracle
├── contracts/         Soroban 22.0.0 — 2 contracts (escrow + verifier)
├── circuits/          Noir 1.0.0-beta.22 — Pedersen-based secret proof
├── docs/              architecture.md (stale), design.md (UI system)
└── media/             Images for the app
```

### What's Working
- **Wallet**: Google OAuth login, BIP39 keypair, send/receive XLM, trustlines
- **Swap**: XLM/USDC/EURT via Stellar DEX (path payments with fallback)
- **ZK Payment Links**: Create → off-chain UltraHonk proof → backend attestation → on-chain claim
- **Contracts**: Deployed on testnet, 6 unit tests passing
- **Circuits**: Noir compiles, Pedersen hashes verified against Barretenberg

### What's Broken/Wonky
- **Swap on testnet**: DEX has near-zero liquidity for USDC/EURT; fallback helps but may still fail for illiquid pairs
- **`.env.example`**: Contains real Google OAuth credentials — need rotation
- **Stale docs**: `architecture.md` references Poseidon/HKDF/rs-soroban-ultrahonk; actual stack uses Pedersen/BIP39/attestation-oracle
- **Webpack cache**: `.next` cache occasionally corrupts on Windows `pnpm dev` restart
- **Design system not followed**: Most components use raw Tailwind instead of semantic classes from `globals.css`

---

## 2. Architecture Flowchart

```
┌────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Next.js)                         │
│                                                                    │
│  ┌──────────────┐    ┌─────────────────────────────────────────┐   │
│  │ Google OAuth  │    │  Wallet (BIP39 mnemonic → Ed25519 KP)  │   │
│  │ (email → JWT) │    │  localStorage-backed, keypair signing   │   │
│  └──────┬───────┘    └──────────┬──────────────────────────────┘   │
│         │                       │                                  │
│         ▼                       ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Create Link Flow                     Claim Link Flow        │  │
│  │                                                              │  │
│  │  1. Enter amount + recipient email  1. Open URL#secret       │  │
│  │  2. Generate 32-byte secret         2. Auto-detect email     │  │
│  │  3. SHA-256(secret) → link_hash    3. Verify email matches  │  │
│  │  4. SHA-256(email) → policy_params  4. Generate UltraHonk   │  │
│  │  5. create_link() on Soroban        5. POST /attest (proof)  │  │
│  │  6. Share URL#secret                6. claim_link() on-chain │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                         │          │                               │
└─────────────────────────┼──────────┼───────────────────────────────┘
                          │          │
                          ▼          ▼
┌────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express, port 3001)                     │
│                                                                    │
│  POST /api/links/:hash/attest                                       │
│    1. SHA-256(secret) == hash?                                     │
│    2. verifyClaimProof(proof, secret, recipient) via bb.js         │
│    3. submitAttestation() → VerifierContract.attest()              │
│                                                                    │
│  GET /api/links/:hash    (stub)                                    │
│  POST /api/links         (stub)                                    │
└────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                    STELLAR TESTNET (Soroban)                       │
│                                                                    │
│  ┌──────────────────────┐     ┌──────────────────────────────┐    │
│  │  AtreusContract      │     │  VerifierContract            │    │
│  │                      │     │                              │    │
│  │  create_link(        │     │  attest(attester,           │    │
│  │    id,               │     │    link_hash, recipient)     │    │
│  │    policy_type,      │◄────┤                              │    │
│  │    policy_params,    │     │  is_attested(                │    │
│  │    amount, asset,    │     │    link_hash, recipient)     │    │
│  │    expiry, sender    │     │                              │    │
│  │  )                   │     └──────────────────────────────┘    │
│  │                      │                                         │
│  │  claim_link(         │     ┌──────────────────────────────┐    │
│  │    link_hash,        │     │  Token (SAC / native)        │    │
│  │    recipient,        ├─────┤                              │    │
│  │    secret,           │     │  transfer() on claim/refund  │    │
│  │    email_hash        │     └──────────────────────────────┘    │
│  │  )                   │                                         │
│  │                      │                                         │
│  │  refund_link(        │                                         │
│  │    link_hash         │                                         │
│  │  )                   │                                         │
│  └──────────────────────┘                                         │
└────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────────┐
│                    NOIR CIRCUIT (circuits/)                        │
│                                                                    │
│  policies/secret.nr                                                │
│                                                                    │
│  pub inputs: recipient, link_hash, nullifier                       │
│  priv inputs: secret                                               │
│                                                                    │
│  constraints:                                                      │
│    pedersen_hash([secret]) == link_hash                            │
│    pedersen_hash([secret, recipient]) == nullifier                 │
│                                                                    │
│  Proves: "I know the secret behind this link_hash"                 │
│  Binds to: recipient address (prevents proof sniping)              │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Priority Fixes

### P0 — Critical
- [ ] **Re-deploy contracts** with the correct `claim_link` signature on testnet
- [ ] **Update contract IDs** in all `.env` files
- [ ] **Verify end-to-end flow** — run `pnpm dev` + `pnpm --filter backend dev`, test full claim cycle

### P1 — Should Fix
- [ ] **Rotate Google OAuth credentials** — `.env.example` has live client ID/secret
- [ ] **Update `docs/architecture.md`** to reflect actual stack (Pedersen not Poseidon, BIP39 not HKDF, attestation-oracle not rs-soroban-ultrahonk)
- [ ] **Clean stale contract IDs** from `.env.example` files

### P2 — Nice to Have
- [ ] **Fix design system compliance** — convert raw Tailwind to semantic classes as per `docs/design.md`
- [ ] **Add loading skeletons** — WASM proof generation takes 5–10s cold start
- [ ] **Handle browser back button** — claim flow state resets on navigation

### P3 — Polish
- [ ] **Remove stub pages** — `/analytics`, `/profile`, `/security`, `/settings` are empty
- [ ] **Favicon** — currently default Next.js icon
- [ ] **Error boundary** — wrap claim flow in React error boundary

---

## 4. Technical Debt Log

| Issue | Impact | Fix |
|-------|--------|-----|
| `docs/architecture.md` references Poseidon/HKDF | Misleading for new contributors | Rewrite to match actual Pedersen/BIP39 stack |
| `.env.example` has real OAuth creds | Security leak | Regenerate credentials, remove from file |
| Test verifier is a mock (returns `true`) | Doesn't test real verification | Deploy real verifier to testnet, test against it |
| Swap uses Horizon (classic) not RPC | Two parallel Stellar SDK paths | Consolidate to RPC-only |
| `pnpm-lock.yaml` may be stale | Dependency mismatch | Run `pnpm install --frozen-lockfile` and verify |
| Frontend uses raw Tailwind not semantic classes | Design inconsistency | Refactor to `.card`, `.btn-primary` per design.md |

---

## 5. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WASM bb.js fails on mobile Safari | Medium | High | Test on Chrome, have fallback message |
| Testnet friendbot rate-limited | Low | High | Pre-fund accounts |
| Contract deployment fails | Low | Medium | Use existing deployment, patch if needed |
| Proof generation takes >30s | Medium | Medium | Pre-generate proof or show clear progress |
| Google OAuth blocked | Low | High | Have backup wallet (mnemonic restore) ready |
| Webpack cache corruption | Medium | Medium | Run `rm -rf .next && pnpm dev` before working |

---

## 6. Quick Commands Reference

```bash
# Frontend
cd frontend && pnpm dev          # Start dev server (localhost:3000)

# Backend
cd backend && pnpm dev           # Start attestation API (localhost:3001)

# Contracts
cd contracts && cargo test       # Run contract unit tests
cd contracts && cargo build --release  # Build WASM

# Circuits (requires Docker on Windows)
docker compose run --rm compile  # Compile Noir circuit
docker compose run --rm test     # Run circuit tests

# E2E test
node backend/scripts/test-attestation.mjs  # Full smoke test
```

---

## 7. Roadmap

| Phase | Feature | Timeline |
|-------|---------|----------|
| **1. MVP** | Google wallet + secret-based payment links + Noir verification | Current |
| **2. Balance Threshold** | `balance_threshold.nr` circuit — prove balance > threshold | Future |
| **3. Wallet Features** | Soroswap swap, transaction history, multi-asset support | Future |
| **4. Allowlist Proofs** | Merkle proof circuit — prove membership without revealing identity | Future |
| **5. Private Payroll** | Bulk link generation, CSV import, enterprise dashboard | Future |
| **6. Developer SDK** | Atreus SDK, API, embeddable widgets | Future |
