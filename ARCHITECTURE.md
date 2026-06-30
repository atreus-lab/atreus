# Atreus — Privacy-Preserving Wallet + Payment Links on Stellar

> Google login. Self-custodial wallet. Payment links with programmable ZK rules. Auto-settling swaps.
> *"Send money with rules only the right wallet can satisfy — without anyone learning who that wallet is."*

---

## Overview

Atreus is a self-custodial wallet that lets you send money with programmable rules. Recipients prove eligibility with zero-knowledge proofs — no identity leak, no double-claim, no proof sniping. Built on Stellar (Soroban).

**Key capabilities:**
- Sign in with Google → derive a Stellar wallet (no seed phrase)
- Create payment links with ZK rules: *only wallets holding >50 XLM can claim*
- Recipient proves the rule with a ZK proof without revealing their balance
- Funds auto-swap via Soroswap on the way in
- All settlement happens on-chain via Soroban contracts

---

## System Architecture

### Layer 1: Client Layer (Prover)

```
┌──────────────────────────────────────┐
│            Browser (Next.js)          │
│                                      │
│  ┌──────────┐  ┌──────────────────┐  │
│  │  Google   │  │   Passkey/       │  │
│  │  OAuth    │  │   WebAuthn       │  │
│  └────┬─────┘  └────────┬─────────┘  │
│       │                 │            │
│  ┌────▼─────────────────▼─────────┐  │
│  │     Stellar Wallet (derived)    │  │
│  └──────────────┬─────────────────┘  │
│                 │                    │
│  ┌──────────────▼─────────────────┐  │
│  │     Noir WASM Prover           │  │
│  │     (Barretenberg backend)     │  │
│  └──────────────┬─────────────────┘  │
│                 │                    │
│  ┌──────────────▼─────────────────┐  │
│  │     Soroban SDK (tx builder)   │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Components:**
- **Google OAuth** — User authenticates with their Google account. A Stellar keypair is deterministically derived from the OAuth identity (same wallet every time).
- **Passkey (WebAuthn)** — Hardware-bound key for transaction signing. Private key never leaves the device.
- **Noir WASM** — Zero-knowledge proof generation in the browser. Compiles the `main.nr` circuit and produces UltraPlonk proofs.
- **Soroban SDK** — Builds and submits Stellar transactions (create_link, claim_link).

### Layer 2: Soroban Smart Contracts

```
┌────────────────────────────────────────────────┐
│              Stellar (Soroban)                   │
│                                                  │
│  ┌──────────────────┐  ┌────────────────────┐   │
│  │  PayLinkContract  │  │  VerifierContract   │   │
│  │                   │  │                     │   │
│  │  • create_link()  │◄─┤  • verify_proof()   │   │
│  │  • claim_link()   │  │                     │   │
│  │  • refund_link()  │  └────────────────────┘   │
│  └────────┬─────────┘                             │
│           │                                       │
│  ┌────────▼─────────┐                             │
│  │  Token Contract   │                             │
│  │  (native / SAC)   │                             │
│  └──────────────────┘                             │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Soroswap DEX (auto-swap on deposit)      │    │
│  └──────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

**Contracts:**
- **PayLinkContract** — Manages escrow: `create_link` deposits funds keyed by `link_hash`, `claim_link` releases to the proven recipient.
- **VerifierContract** — Validates UltraPlonk ZK proofs. Returns true/false. Designed to work with Noir-generated verification keys.
- **Token Contract** — Stellar Asset Contract (SAC) for non-native assets, or native XLM.
- **Soroswap** — Automatic token swap when funds are deposited into a link (e.g., USDC → XLM).

### Layer 3: ZK Circuit (Noir)

```
         Private Inputs              Public Inputs
        ┌────────────────┐        ┌─────────────────┐
        │   secret        │        │  link_hash       │
        │   passkey_sig   │        │  rule_commitment  │
        │   balance       │        │  nullifier        │
        └────────┬───────┘        └────────┬─────────┘
                 │                         │
        ┌────────▼─────────────────────────▼─────────┐
        │               Noir Circuit                  │
        │                                              │
        │  • hash(secret) == link_hash                 │
        │  • verify_passkey(passkey_sig)               │
        │  • prove_balance(balance, threshold)          │
        │  • compute_nullifier(secret, recipient)       │
        │                                              │
        └────────────────────┬─────────────────────────┘
                             │
                             ▼
                    UltraPlonk Proof
```

**Circuit capabilities:**
- **Stage 1 (MVP):** Prove knowledge of `secret` (hash preimage). No balance disclosed.
- **Stage 2:** Prove balance > threshold without revealing exact balance (range proof).
- **Stage 3:** Prove membership in an allowlist (Merkle proof).

---

## Data Flow

### Creating a Payment Link

```
Sender                          Frontend                         Soroban
  │                                │                                │
  │  1. Sign in with Google        │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │  2. Enter amount + rules       │                                │
  │     (e.g., >50 XLM)           │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │  3. Generate secret + link     │  4. create_link(               │
  │     hash locally               │     token, amount, link_hash)  │
  │◄──────────────────────────────│──────────────────────────────►│
  │                                │                                │
  │  5. Share link                 │                                │
  │     (URL#secret)              │                                │
  │──────────────────────────────►│                                │
```

### Claiming a Payment Link

```
Recipient                        Frontend                         Soroban
  │                                │                                │
  │  1. Open link (URL#secret)     │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │  2. Auth with Passkey          │                                │
  │◄──────────────────────────────│                                │
  │                                │                                │
  │  3. Generate ZK proof          │                                │
  │    (secret, passkey, balance)  │                                │
  │──────────────────────────────►│                                │
  │                                │                                │
  │                                │  4. claim_link(                │
  │                                │     link_hash, proof)          │
  │                                │──────────────────────────────►│
  │                                │                                │
  │                                │  5. Verify proof               │
  │                                │  + transfer funds              │
  │                                │◄──────────────────────────────│
  │◄──────────────────────────────│                                │
  │  6. Done!                     │                                │
```

---

## Wallet Architecture

### Deterministic Derivation from Google OAuth

```
Google OAuth (sub, email)
        │
        ▼
HKDF(oauth_sub + app_seed)
        │
        ▼
Stellar Keypair (Ed25519)
  • Public Key: G...
  • Secret Key: S... (never stored, derived on each login)
```

**Approach:**
- User signs in with Google → we get `sub` (unique user ID) and `email`.
- Client-side: derive a Stellar keypair using HKDF with the `sub` as input.
- Same Google account → same Stellar wallet every time.
- No seed phrase to back up. No server-side key storage.
- **Warning:** If Google account is lost, the wallet is unrecoverable. Mitigation: future export/backup flow.

### Transaction Authorization

1. Wallet derivation happens client-side in the browser (Web Worker).
2. Transactions are signed locally with the derived key.
3. For high-value txs, require additional Passkey signature (WebAuthn).
4. Signed tx is submitted to Stellar via the backend relay or directly.

---

## Smart Contract Design

### PayLinkContract

```rust
pub struct LinkInfo {
    pub creator: Address,       // who funded the link
    pub amount: i128,           // amount escrowed
    pub token: Address,         // token address (native | sac)
    pub rule_hash: BytesN<32>,  // commitment to the ZK rule
    pub claimed: bool,          // double-claim guard
    pub expires_at: u64,        // unix timestamp for refund
}

pub fn create_link(creator, token, amount, link_hash, rule_hash, expires_at);
pub fn claim_link(recipient, link_hash, proof);
pub fn refund_link(creator, link_hash);  // after expiry
```

### VerifierContract

```rust
pub fn verify_proof(
    verification_key: Bytes,
    proof: Bytes,
    public_inputs: Bytes,
) -> bool;
```

Returns `true` if the UltraPlonk proof is valid for the given public inputs and verification key.

---

## ZK Rule System

### MVP Rule Types

| Rule Type    | Description                          | Prove without revealing |
| ------------ | ------------------------------------ | ----------------------- |
| **Secret**   | Know the link secret (preimage)      | The secret itself       |
| **Balance**  | Hold > N tokens at a Stellar address | Exact balance           |
| **Allowlist**| Address is in a Merkle allowlist     | Position in tree        |

### Nullifier System

Each claim produces a unique nullifier: `hash(secret, recipient_address)`. Prevents double-claiming without linking the recipient's identity to the original link.

---

## Security Model

### Threat: Proof Sniping
An attacker watches the mempool and attempts to front-run a claim with their own proof.

**Mitigation:** Bind the proof to the recipient's address. The proof includes `recipient_address` as a public input, so it can only be used by that specific recipient.

### Threat: Double Claim
A recipient submits the same proof twice.

**Mitigation:** Nullifier is stored on-chain. If a nullifier has been seen before, the claim is rejected.

### Threat: Secret Leakage
The link secret is intercepted in transit.

**Mitigation:** Secret is in the URL fragment (`#secret`), which is never sent to the server. Recipient proves knowledge via ZK, not by revealing it.

---

## Future Roadmap

- **Stage 2:** Shielded balances — hide the amount being transferred.
- **Stage 3:** Compliance proofs (zk-KYC) — prove you're not sanctioned without revealing your identity.
- **Stage 4:** Private Payroll — bulk link generation with CSV import.
- **Stage 5:** Developer SDK — embeddable widgets and API.
