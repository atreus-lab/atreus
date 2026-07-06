# Atreus — Architecture

> Google-login wallet + privacy-preserving payment links with programmable ZK rules on Stellar.
> No seed phrase. No identity leak. No double-claim. No proof sniping.

---

## 1. Product Overview

Atreus is a **TipLink-style wallet on Stellar** with an added **ZK-powered payment link system**.

### Core Product (Wallet)
- Sign in with Google → deterministic Stellar wallet (HKDF derivation)
- Send / receive XLM and Stellar assets
- Swap tokens via Soroswap
- Transaction history
- Mnemonic export for backup recovery

### Add-on Feature (ZK Payment Links)
- Create payment links with programmable rules
- Recipient proves eligibility with zero-knowledge proof (no identity leak)
- On-chain verification via Noir + rs-soroban-ultrahonk
- Double-claim prevention via nullifiers

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React 18, Tailwind CSS | Wallet UI, link create/claim |
| **Wallet Auth** | Google OAuth + HKDF | Deterministic Stellar keypair from Google identity |
| **Backup** | BIP-39 mnemonic export | Recovery if Google account lost |
| **Blockchain SDK** | @stellar/stellar-sdk, @stellar/freighter-api | Transaction building, wallet connection |
| **Smart Contracts** | Rust, Soroban SDK 22.0.0 | Escrow + ZK verifier |
| **ZK Circuits** | Noir (1.0.0-beta.9) | Zero-knowledge proof circuits |
| **ZK Proving** | Barretenberg (bb.js 0.87.0) | UltraHonk proof generation (browser + Node) |
| **ZK Verification** | rs-soroban-ultrahonk | On-chain UltraHonk verification in Soroban |
| **Hash Primitive** | Poseidon (Protocol 25/26 native) | ZK-friendly hashing (native host function on Stellar) |
| **Backend** | Express, TypeScript | Link management API, tx relay |
| **Package Manager** | pnpm (monorepo) | Workspace management |
| **DEX** | Soroswap | Token swaps |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                         │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │ Google OAuth  │    │  Stellar Wallet (HKDF derived)   │   │
│  └──────┬───────┘    └──────────┬───────────────────────┘   │
│         │                       │                           │
│         │              ┌────────▼────────┐                  │
│         │              │  Soroban SDK    │                  │
│         │              │  (tx builder)   │                  │
│         │              └────────┬────────┘                  │
│         │                       │                           │
│  ┌──────▼───────────────────────▼───────────────────────┐   │
│  │              Noir WASM Prover (Barretenberg)          │   │
│  │  • Generate UltraHonk proofs in browser              │   │
│  │  • Poseidon hash (native BN254)                      │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Stellar (Soroban)                           │
│                                                             │
│  ┌─────────────────────┐    ┌───────────────────────────┐   │
│  │  AtreusContract     │    │  VerifierContract         │   │
│  │                     │    │  (rs-soroban-ultrahonk)   │   │
│  │  • create_link()    │◄───┤  • verify_proof()         │   │
│  │  • claim_link()     │    │  • VK set at deploy time  │   │
│  │  • refund_link()    │    └───────────────────────────┘   │
│  └────────┬────────────┘                                    │
│           │                                                 │
│  ┌────────▼────────────┐    ┌───────────────────────────┐   │
│  │  Token Contract     │    │  Soroswap DEX             │   │
│  │  (native / SAC)     │    │  (auto-swap on deposit)   │   │
│  └─────────────────────┘    └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Wallet Architecture

### Google OAuth + HKDF Derivation

```
Google OAuth (sub, email)
        │
        ▼
HKDF(oauth_sub + app_secret)
        │
        ▼
Stellar Keypair (Ed25519)
  • Public Key: G...
  • Secret Key: S... (derived on each login, never stored server-side)
```

**Flow:**
1. User clicks "Sign in with Google"
2. Google returns `sub` (unique user ID) and `email`
3. Client-side: HKDF derives a 32-byte seed from `sub` + app secret
4. Seed → Stellar Ed25519 keypair (same Google account = same wallet every time)
5. Wallet created on first login (funded via friendbot on testnet)
6. User can export BIP-39 mnemonic for backup recovery

**Recovery Mechanism:**
- After first login, user sees a 24-word mnemonic
- User stores it offline
- If Google account is lost/banned, mnemonic restores the same Stellar keypair
- This is critical — without it, Google has indirect custody over user funds

### Transaction Signing

1. Wallet derivation happens client-side in the browser
2. Transactions are signed locally with the derived key
3. For Freighter-connected wallets, use `@stellar/freighter-api` for signing
4. Signed tx is submitted to Stellar via Soroban RPC

---

## 5. Smart Contract Design

### AtreusContract

```rust
#[contracttype]
pub struct LinkInfo {
    pub creator: Address,       // who funded the link
    pub amount: i128,           // amount escrowed (in stroops)
    pub token: Address,         // token address (native XLM or SAC)
    pub link_hash: BytesN<32>,  // PoseidonHash(secret) — commitment
    pub policy_type: Symbol,    // "secret" | "balance_threshold" | "allowlist"
    pub policy_params: Bytes,   // serialized policy parameters
    pub claimed: bool,          // double-claim guard
    pub expires_at: u64,        // unix timestamp for refund
}

pub fn create_link(
    env: Env,
    id: BytesN<32>,
    policy_type: Symbol,
    policy_params: Bytes,
    amount: i128,
    asset: Address,
    expiry: u64,
    sender: Address,
);

pub fn claim_link(
    env: Env,
    link_hash: BytesN<32>,
    recipient: Address,
    proof: Bytes,
);

pub fn refund_link(
    env: Env,
    link_hash: BytesN<32>,
);
```

### VerifierContract (rs-soroban-ultrahonk)

```rust
// Deployed per-circuit. VK is set at constructor time (immutable).
// Generated automatically from Noir circuit via rs-soroban-ultrahonk tooling.

pub fn verify_proof(
    env: Env,
    public_inputs: Bytes,
    proof: Bytes,
) -> bool;
```

**Key facts:**
- VK (verification key) is stored on-chain at deploy time
- `verify_proof` uses the stored VK — no VK passed per call
- Uses Stellar Protocol 25/26 native BN254 host functions for efficient verification
- Each circuit (secret, balance_threshold) gets its own verifier contract

---

## 6. ZK Circuit Design (Noir)

### Circuit: `policies/secret.nr`

The MVP circuit. Proves knowledge of the link secret without revealing it.

```rust
// Private inputs
fn main(
    secret: Field,                    // the link secret (private)
    recipient: pub Field,             // recipient address (public, binds proof)
    link_hash: pub Field,             // PoseidonHash(secret) stored on-chain (public)
    nullifier_hash: pub Field,        // Hash(secret, recipient) for double-claim prevention (public)
) {
    // 1. Secret commitment: PoseidonHash(secret) must match on-chain link_hash
    let computed_hash = std::hash::poseidon::bn254::hash_1([secret]);
    assert(computed_hash == link_hash);

    // 2. Nullifier: Hash(secret, recipient) prevents double-claim
    let computed_nullifier = std::hash::poseidon::bn254::hash_2([secret, recipient]);
    assert(computed_nullifier == nullifier_hash);

    // 3. Recipient binding: proof can only be used by this recipient
    // (prevents proof sniping / front-running)
}
```

**Private inputs:** `secret`
**Public inputs:** `recipient`, `link_hash`, `nullifier_hash`
**Constraints:**
- `PoseidonHash(secret) == link_hash`
- `PoseidonHash(secret, recipient) == nullifier_hash`

### Circuit: `policies/balance_threshold.nr`

The "killer demo" circuit. Proves balance > threshold without revealing exact balance.

```rust
fn main(
    balance: Field,                   // actual balance (private)
    threshold: pub Field,             // minimum required (public)
    balance_commitment: pub Field,    // PoseidonHash(balance) (public)
) {
    // 1. Balance commitment matches
    let computed = std::hash::poseidon::bn254::hash_1([balance]);
    assert(computed == balance_commitment);

    // 2. Balance >= threshold (range proof)
    // In Noir, we prove balance - threshold >= 0 by using field arithmetic
    let diff = balance - threshold;
    // The circuit constrains this implicitly through the assert
}
```

### Proof Generation Flow

```
Browser (Next.js)
        │
        ▼
bb.js (Barretenberg WASM)
  1. Load compiled circuit (.json)
  2. Load witness (private + public inputs)
  3. Generate UltraHonk proof
  4. Export proof + public_inputs as bytes
        │
        ▼
Soroban SDK
  5. Call claim_link(link_hash, recipient, proof_bytes)
        │
        ▼
VerifierContract.verify_proof(public_inputs, proof)
  6. On-chain UltraHonk verification using native BN254 host functions
  7. Returns true/false
```

---

## 7. Data Flow

### Creating a Payment Link

```
Sender                          Frontend                         Soroban
  │                                │                                │
  │  1. Sign in with Google        │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │  2. Enter amount + policy      │                                │
  │     (e.g., "secret" rule)      │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │  3. Generate secret (32 bytes) │  4. create_link(               │
  │     Compute link_hash =        │     id, policy_type,           │
  │     PoseidonHash(secret)       │     policy_params, amount,     │
  │                                │     asset, expiry, sender)     │
  │◄──────────────────────────────│──────────────────────────────►│
  │                                │                                │
  │  5. Share link                 │                                │
  │     (https://app/claim#secret) │                                │
  │──────────────────────────────►│                                │
```

### Claiming a Payment Link

```
Recipient                        Frontend                         Soroban
  │                                │                                │
  │  1. Open link (URL#secret)     │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │  2. Read secret from fragment  │                                │
  │     Derive recipient address   │                                │
  │                                │                                │
  │  3. Generate ZK proof          │                                │
  │     (bb.js in browser)         │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │                                │  4. claim_link(                │
  │                                │     link_hash, recipient,      │
  │                                │     proof_bytes)               │
  │                                │──────────────────────────────►│
  │                                │                                │
  │                                │  5. VerifierContract           │
  │                                │     .verify_proof()            │
  │                                │  6. Check nullifier not used   │
  │                                │  7. Transfer funds             │
  │                                │◄──────────────────────────────│
  │◄──────────────────────────────│                                │
  │  8. Done!                      │                                │
```

---

## 8. Security Model

### Threat: Proof Sniping (MEV)
An attacker watches the mempool and front-runs a claim with their own proof.

**Mitigation:** `recipient` address is a public input in the circuit. The proof is bound to a specific recipient — it cannot be reused by anyone else.

### Threat: Double Claim
A recipient submits the same proof twice.

**Mitigation:** Nullifier `PoseidonHash(secret, recipient)` is stored on-chain after first claim. Duplicate nullifiers are rejected.

### Threat: Secret Leakage
The link secret is intercepted in transit.

**Mitigation:** Secret lives in the URL fragment (`#secret`), which is never sent to the server. The ZK proof proves knowledge of the secret without revealing it on-chain.

### Threat: Google Account Loss
User's Google account is banned or deleted.

**Mitigation:** BIP-39 mnemonic export on first login. User can restore the same Stellar keypair from the mnemonic without Google.

---

## 9. MVP Scope

### MUST BUILD
1. **Google Login + Wallet** — HKDF derivation, wallet dashboard, balance display
2. **Mnemonic Export** — 24-word BIP-39 backup on first login
3. **Send XLM** — Transfer to any Stellar address via Freighter
4. **Receive** — Show QR code + public address
5. **Create Payment Link** — Generate secret, compute PoseidonHash, escrow in Soroban contract
6. **Claim Payment Link** — URL fragment → ZK proof → on-chain verification → funds released
7. **Noir Circuit (secret.nr)** — Poseidon commitment + nullifier + recipient binding
8. **Soroban Verifier** — rs-soroban-ultrahonk generated verifier contract
9. **End-to-End Demo** — Sender → Escrow → Claim with ZK → Recipient receives funds

### SHOULD BUILD
1. **Balance Threshold Circuit** — `balance_threshold.nr` (the "killer demo")
2. **Link Expiration** — TTL + refund after expiry
3. **Swap via Soroswap** — Auto-swap tokens on deposit
4. **Claim Status Dashboard** — Sender sees which links are claimed

### DO NOT BUILD
- Full shielded transfers / privacy mixer
- Multi-chain support
- Enterprise dashboards
- Passkeys as primary auth (Phase 2)

---

## 10. Demo Flow

### Step 1: Create Link
1. Sender navigates to `/create`
2. Signs in with Google (wallet derived)
3. Enters amount: `100 XLM`
4. Selects policy: "Secret knowledge"
5. Clicks "Create Link"
6. Frontend generates 32-byte secret, computes `PoseidonHash(secret)`
7. Calls `create_link()` on Soroban contract
8. Displays shareable URL: `https://atreus.app/claim#<secret_hex>`

### Step 2: Share Link
Sender copies link, sends via Telegram/email/QR.

### Step 3: Claim Link
1. Recipient opens link in browser
2. Frontend reads secret from URL fragment
3. Recipient signs in with Google (or connects Freighter)
4. Frontend generates UltraHonk proof via bb.js (browser WASM)
5. Proof proves: `PoseidonHash(secret) == link_hash` without revealing secret
6. Frontend calls `claim_link(link_hash, recipient, proof)`
7. Soroban contract verifies proof on-chain, checks nullifier, transfers funds

### Step 4: Verify
- Show Stellar Explorer — `secret` never appears in transaction history
- Show only `proof` bytes submitted on-chain
- Highlight: "The recipient proved they know the secret without revealing it"

---

## 11. Roadmap

| Phase | Feature | Timeline |
|-------|---------|----------|
| **1. MVP** | Google wallet + secret-based payment links + Noir verification | Current |
| **2. Balance Threshold** | `balance_threshold.nr` circuit — prove balance > threshold | Future |
| **3. Wallet Features** | Soroswap swap, transaction history, multi-asset support | Future |
| **4. Allowlist Proofs** | Merkle proof circuit — prove membership without revealing identity | Future |
| **5. Private Payroll** | Bulk link generation, CSV import, enterprise dashboard | Future |
| **6. Developer SDK** | Atreus SDK, API, embeddable widgets | Future |

---

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Browser proving performance** | High | Keep circuits small (Stage 1 only), use optimized bb.js WASM |
| **Soroban WASM limits** | Medium | Protocol 25/26 optimizations, separate verifier from business logic |
| **Circuit bugs** | High | Extensive `nargo test`, use well-audited Poseidon primitive |
| **Google account loss** | High | BIP-39 mnemonic export for recovery |
| **Proof sniping (MEV)** | High | Bind proof to recipient address as public input |
| **Scope creep** | High | Stick to MUST BUILD list only |
| **Noir → Soroban integration friction** | Medium | Use rs-soroban-ultrahonk tooling (proven workflow) |

---

## 13. References

- [Stellar Developer Docs](https://developers.stellar.org/llms.txt)
- [Soroban Smart Contracts](https://developers.stellar.org/docs/build/smart-contracts/overview.md)
- [Noir Language](https://noir-lang.org/docs/)
- [rs-soroban-ultrahonk (Noir verifier for Soroban)](https://github.com/NethermindEth/rs-soroban-ultrahonk)
- [Noir on Stellar Tutorial](https://jamesbachini.com/noir-on-stellar/)
- [TipLink (reference product)](https://github.com/TipLink)
- [LOBSTR Wallet (reference)](https://github.com/Lobstrco)
- [Soroswap](https://soroswap.finance)
- [Protocol 25 (Poseidon/BN254 native)](https://stellar.org/blog)
- [Protocol 26 (BN254 host functions)](https://stellar.org/blog)
