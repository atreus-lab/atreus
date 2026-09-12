# Atomic Claim-and-Swap Architecture

> Automated token swapping during payment link claim via Soroswap Router on Soroban.

---

## 1. Overview

The **Atomic Claim-and-Swap** mechanism enables recipients of Atreus payment links to claim an escrowed asset (e.g. XLM) and automatically receive a different desired token (e.g. USDC or EURT) in a single atomic transaction.

Instead of requiring users to:
1. Claim the escrowed token into their wallet.
2. Approve a DEX router for the claimed tokens.
3. Execute a swap on a DEX in a second transaction.

Atreus interacts directly with the **Soroswap Router contract** on Soroban during the claim execution. The swap is executed within the same transaction execution context, providing full atomicity, slippage protection, and gas efficiency.

---

## 2. Cross-Contract Call Flow

```
┌─────────────┐        1. claim_and_swap_link()         ┌────────────────────┐
│  Recipient  ├────────────────────────────────────────►│   AtreusContract   │
└─────────────┘                                         └────────┬───────────┘
                                                                 │
                                          2. is_attested()       │
                                          ┌──────────────────────┼──────────────────────┐
                                          │                      ▼                      │
                                          │            ┌────────────────────┐           │
                                          │            │  VerifierContract  │           │
                                          │            └────────────────────┘           │
                                          │                                             │
                                          │ 3. Transfer input token to Router           │
                                          │    & call swap_exact_tokens_for_tokens()    │
                                          │                                             │
                                          ▼                                             ▼
                               ┌────────────────────┐                         ┌────────────────────┐
                               │  Soroswap Router   ├────────────────────────►│     Recipient      │
                               └────────────────────┘ 4. Swapped output token └────────────────────┘
```

### Execution Steps:
1. **Authorization Check:** Recipient authorizes the call via `recipient.require_auth()`.
2. **Secret Preimage & Expiry:** Contract validates `sha256(secret) == link_hash` and checks that the link is not expired or already claimed.
3. **ZK & Policy Attestation:** Cross-contract call to `VerifierContract::is_attested(link_hash, recipient)` ensures UltraHonk proof verification was vouched for by the trusted attester. If `policy_type == 1`, `VerifierContract::is_email_attested` is also verified.
4. **Nullifier & Slippage Validation:** Validates `deadline >= ledger.timestamp()`, `min_amount_out > 0`, `path.len() >= 2`, and asserts `path[0] == link_info.asset` and `path[last] != link_info.asset`.
5. **Relayer Fee Payout:** If `relayer_fee > 0`, transfers the fee amount in input token directly to `relayer_address`.
6. **Router Transfer & Swap:** Transfers the remaining `swap_amount` of input token to the Soroswap Router and invokes `swap_exact_tokens_for_tokens(...)` directing the swapped output tokens directly to `recipient`.
7. **Storage & Event Emission:** Sets `link_info.claimed = true`, records nullifier in persistent storage, and publishes event `(symbol_short!("clm_swap"), link_hash)`.

---

## 3. Smart Contract Interface

### Soroswap Router Interface
Defined in [`contracts/atreus-contract/src/lib.rs`](file:///workspaces/atreus/contracts/atreus-contract/src/lib.rs):

```rust
#[soroban_sdk::contractclient(name = "SoroswapRouterClient")]
pub trait SoroswapRouterInterface {
    fn swap_exact_tokens_for_tokens(
        env: Env,
        amount_in: i128,
        amount_out_min: i128,
        path: Vec<Address>,
        to: Address,
        deadline: u64,
    ) -> Vec<i128>;
}
```

### `claim_and_swap_link` Function Signature

```rust
pub fn claim_and_swap_link(
    env: Env,
    link_hash: BytesN<32>,
    secret: BytesN<32>,
    recipient: Address,
    router: Address,
    path: Vec<Address>,
    min_amount_out: i128,
    deadline: u64,
    relayer_fee: i128,
    relayer_address: Option<Address>,
) -> Vec<i128>
```

#### Parameters:
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `env` | `Env` | Soroban runtime environment. |
| `link_hash` | `BytesN<32>` | SHA-256 hash commitment of the link secret. |
| `secret` | `BytesN<32>` | Preimage secret revealed by claimer. |
| `recipient` | `Address` | Address receiving the swapped output tokens. |
| `router` | `Address` | Deployed Soroswap Router contract address. |
| `path` | `Vec<Address>` | Multi-hop or direct token address route (`path[0]` = escrow asset, `path[last]` = target asset). |
| `min_amount_out` | `i128` | Minimum acceptable output token amount (slippage threshold). |
| `deadline` | `u64` | Unix timestamp after which the swap transaction will be rejected. |
| `relayer_fee` | `i128` | Gasless relayer fee deducted from escrow amount in input token. |
| `relayer_address` | `Option<Address>` | Address receiving the relayer compensation. |

---

## 4. Slippage Protection & Atomic Rollback

If the DEX pool liquidity fluctuates or market price moves unfavorably such that the output token amount is less than `min_amount_out`, the Soroswap Router invocation panics (`INSUFFICIENT_OUTPUT_AMOUNT`).

Because Soroban smart contracts execute under strict ACID transactional guarantees:
- The entire transaction reverts cleanly.
- No tokens are transferred out of escrow.
- The link is **NOT** marked as claimed.
- The ZK nullifier is **NOT** consumed.
- The recipient can retry the claim-and-swap with updated slippage parameters or claim the link as the original asset.

---

## 5. Frontend & Routing Integration

The frontend routing utility in [`frontend/src/lib/soroswap.ts`](file:///workspaces/atreus/frontend/src/lib/soroswap.ts) handles:
1. **Dynamic Quoting:** Calls `fetchOptimalSwapPath(assetIn, assetOut, amountIn, slippageTolerancePct)` to query Soroswap API / reference rates.
2. **Slippage Computation:** Applies 1.0% default slippage tolerance to calculate `minAmountOut`.
3. **Transaction Assembly:** Formats token addresses into `xdr.ScVal.scvVec` and sets a 5-minute transaction deadline before invoking `prepareTransaction` and signing.
