## Goal
- Build Atreus: TipLink-style Google-login wallet on Stellar with ZK payment links as stretch goal, for Stellar Hacks deadline Jul 3 17:00 UTC (~47 hrs left).

## Constraints & Preferences
- **ZK proving pipeline is Windows-blocked** (bb.js WASM crash). Shipping non-ZK MVP first: SHA256-based link verification in contract.
- Replace `poseidon-lite` with **Web Crypto SHA256** for link_hash (no WASM dep). Upgrade to Pedersen + ZK in Phase 2.
- `claim_link` contract signature changed: `proof: Bytes` → `secret: BytesN<32>`. Contract verifies `sha256(secret) == link_hash`.
- No nargo binary on Windows. Use **Docker image** (`atreus-dev: Node 20 + nargo 1.0.0-beta.22`) for compile/test/execute.
- Single-source docs in `docs/architecture.md`, design system in `docs/design.md` — untouched since last session.
- Backend Express cut — frontend calls Soroban directly.
- No frontend/backend tests — only contracts + circuits.

## Progress
### Done
- **Contract compiled, all 5 tests pass**: `test_create_and_claim`, `test_wrong_secret_fails`, `test_double_claim_fails`, `test_refund_after_expiry`, `test_claim_expired_fails`. No warnings.
- **`try_claim_link()` pattern** replaces `catch_unwind` → no `extern crate std` needed, no `UnwindSafe` issues.
- **`create/page.tsx`**: replaced `poseidon-lite` with Web Crypto `SHA-256`. Secret = 32 random bytes, link_hash = SHA256(secret).
- **`claim/page.tsx`**: real flow — parse secret from URL hash → SHA256 → Freighter connect → `claimLinkTx()` → submit.
- **`claimLinkTx()` added to `stellar.ts`**: builds + simulates + signs `claim_link(linkHash, recipient, secret)` via Freighter.
- **`stellar.ts`**: both `createEscrowTx` and `claimLinkTx` use `Buffer.from()` for `scvBytes` (satisfies TypeScript + Buffer polyfill).
- **`next.config.js`**: Buffer polyfill via `buffer` package + webpack `ProvidePlugin`.
- **Frontend builds successfully** (Next.js 15.5.19 production build).
- **`poseidon-lite` removed** from `package.json`.
- **Docker dev image built**: `atreus-dev` (Node 20 + nargo 1.0.0-beta.22) via `Dockerfile`. `docker-compose.yml` with services: `dev`, `compile`, `test`, `execute`, `prove`.
- **Circuit compiles + tests pass**: `nargo test --show-output` → 2 tests pass (`test_main_happy_path`, `policies::secret::test_happy_path`).
- **`nargo execute` works**: produces `target/secret.gz` witness. Reference hash values computed via `hash-tool` helper package.
- **bb.js Pedersen = Noir Pedersen**: verified with `hashIndex=0`. `pedersen_hash([42])` and `pedersen_hash([42, 123])` match exactly.
- **`VerifierContract` kept as placeholder** — no generated verifier code needed for MVP.

### Blocked
- **bb.js UltraHonk proving crashes on Windows Node 20**: `RuntimeError: unreachable` inside WASM during `generateProof()`. Workaround: `nargo execute` via Docker (works), actual proof gen deferred to Phase 2.
- **Docker engine unstable**: `500 Internal Server Error` mid-build, service stuck at `Stopped`. Must restart Docker Desktop or use `docker context` fallback.
- **Contract not deployed to testnet**: needs `stellar contract deploy` + `stellar contract invoke` for E2E verification.

## Key Decisions
- **Ship non-ZK MVP first**: ZK proving is Windows-blocked. Use SHA256 for link verification in contract (available in both browser Web Crypto and Soroban `env.crypto().sha256()`). Phase 2 replaces with Pedersen + UltraHonk proof.
- **`claim_link` changed from `proof: Bytes` to `secret: BytesN<32>`**: contract verifies `sha256(secret) == link_hash`. Nullifier = `sha256(link_hash)`. Upgrade path: swap `secret` param → `proof`, replace sha256 check → verifier cross-contract call.
- **Frontend hash uses Web Crypto API**, not bb.js (to avoid WASM loading in browser). SHA256 is deterministic, works everywhere, and matches contract.
- **Docker is the dev environment** for nargo. Node.js scripts (`prove-circuit.mjs`) also run in Docker to avoid Windows WASM issues.
- **Test failures use `try_claim_link()` pattern** instead of `catch_unwind` → avoids `UnwindSafe` requirement from `Env`'s `RefCell`.

## Next Steps
1. **Deploy contracts to testnet**: `stellar contract deploy` + `stellar contract invoke` for end-to-end test.
2. Record demo video, submit.

## Critical Context
- Hackathon deadline: Jul 3, 2026 17:00 UTC. ~47 hrs remaining. Prize pool: $10,000.
- Noir v1.0.0-beta.22 has NO Windows binary. Use Docker for nargo commands.
- bb.js UltraHonk WASM crashes on Windows Node 20. Proving only works in Docker (unresolved WASM memory issue).
- Docker Desktop engine is unstable — may need restart or WSL fallback.
- `poseidon-lite` was replaced everywhere with Pedersen/SHA256. `std::hash::poseidon::bn254` doesn't exist in any Noir version.
- `@aztec/bb.js` BarretenbergSync requires WASM files at `process.cwd()`. Browser build also uses WASM (Web Worker). SHA256 avoids both.
- Version pins: Noir 1.0.0-beta.22, bb.js 4.4.0, Soroban SDK 22.0.0, Rust 1.85+, Node 20.

## Relevant Files
- `circuits/`: `Nargo.toml`, `src/main.nr`, `src/policies/secret.nr` — compiles, tests pass via Docker. `Prover.toml` has real hash values.
- `circuits/hash-tool/`: helper package that computed reference Pedersen hash values via `nargo execute`.
- `contracts/atreus-contract/src/lib.rs`: `claim_link` takes `secret: BytesN<32>`, verifies `sha256(secret) == link_hash`.
- `contracts/atreus-contract/src/test.rs`: 5 tests using `try_claim_link()` pattern, all pass.
- `contracts/verifier-contract/src/lib.rs`: placeholder (not used in MVP).
- `frontend/src/lib/stellar.ts`: `createEscrowTx` + `claimLinkTx` — both use Freighter signing.
- `frontend/src/app/create/page.tsx`: Web Crypto SHA256 for link_hash generation.
- `frontend/src/app/claim/page.tsx`: real flow — parse secret → SHA256 → Freighter → claim tx.
- `frontend/next.config.js`: Buffer polyfill configured for `@stellar/stellar-sdk`.
- `Dockerfile`: Node 20 + nargo 1.0.0-beta.22. `docker-compose.yml`: dev/compile/test/execute/prove services.
- `frontend/scripts/prove-circuit.mjs`: UltraHonk proof via bb.js (crashes on Windows, runs in Docker).
- `frontend/scripts/verify-pedersen.mjs`: confirmed bb.js Pedersen matches Noir (hashIndex=0).
- `.dockerignore`: excludes node_modules/, target/ from Docker build context.
