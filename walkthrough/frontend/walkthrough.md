# Frontend Walkthrough

This is a running log of frontend work on Atreus — one entry per issue/PR.
It exists so agents/contributors picking up a new frontend issue can quickly
understand what's already wired, what patterns to follow, and what's still
blocked, without re-reading every PR diff.

**Rules for adding to this file:**
- Do **not** create a new walkthrough file or folder for frontend work —
  add a new entry to this file instead.
- New entries go at the **top**, directly below this section (most recent
  first). Don't insert in issue-number order — insert in the order the work
  actually landed.
- Copy the template below for each new entry. Keep entries self-contained —
  a reader should be able to understand your entry without reading the ones
  above or below it.
- If your issue spans another area (backend/contracts), put the full entry
  in whichever walkthrough owns the primary diff, and add a one-line
  cross-link in the other file instead of duplicating content.

<details>
<summary>Entry template (click to expand, copy for your entry)</summary>

```md
### Issue #N — <short title>

**Date:** YYYY-MM-DD
**Author:** <github handle>

**Files touched:**
- `path/to/file`

#### What changed
Plain-language summary of the feature/fix and why it was needed.

#### Key implementation details
Anything a reviewer or future contributor needs to know to safely modify
this code — non-obvious decisions, gotchas, why you did X instead of Y.

#### Testing status
What was actually verified (manually, automated, etc.) and what wasn't,
and why.

#### Known limitations / blockers
Anything left unresolved, dependent on another issue, or deliberately
out of scope.

#### Next steps for whoever picks this up
Concrete, actionable pointers — not just "more testing needed."
```

</details>

---

### Issue #6 — Wire Create Link page to real Stellar/Soroban

**Date:** 2026-07-01
**Author:** temycodes

**Files touched:**
- `frontend/src/app/create/page.tsx`
- `frontend/src/lib/stellar.ts`

#### What changed

The `/create` page previously generated a mock link with a random secret and
never touched the network. It now performs the full real flow:

1. Connects the user's wallet via Freighter (`connectWallet()`)
2. Generates a 31-byte random secret client-side and hashes it with Poseidon
   (BN254-friendly — chosen for future compatibility with the ZK proof used
   on the claim side)
3. Builds and submits a `create_link()` call to the `PayLinkContract` via
   `@stellar/stellar-sdk`, passing the hash, policy type, amount (converted
   to stroops), token address, expiry, and creator address
4. Polls Soroban RPC for the final transaction result (see below — this was
   the main gap in the original wiring)
5. Derives the recipient-facing `/claim#<secret>` URL — secret lives in the
   URL fragment only, never sent to any server — and shows a copyable link
   preview with clipboard support

#### Key implementation details

**Transaction confirmation polling.** `rpcServer.sendTransaction()` only
confirms a transaction was accepted into the mempool (status `PENDING`) — it
does **not** mean the transaction succeeded. Soroban transactions can still
fail after that point (contract panic, insufficient balance, etc). The
original draft of this code only checked submission status, which meant a
user could see a "successful" link even if the escrow was never actually
funded. Fixed by adding `waitForTransaction()` in `stellar.ts`, which polls
`rpcServer.getTransaction(hash)` until it resolves to `SUCCESS`/`FAILED`
(30s timeout), and `createEscrowTx` now awaits this before returning. The UI
reflects this with a distinct `"Confirming on Stellar..."` button state,
separate from `"Waiting for signature..."`, since this adds a few seconds of
real latency users would otherwise stare at a static spinner for.

**Token address.** Defaults to the native XLM Stellar Asset Contract
(`Asset.native().contractId(networkPassphrase)`) rather than a placeholder
string, since amounts on this page are XLM-denominated. Override with
`NEXT_PUBLIC_TOKEN_ID` if a non-native asset is ever needed here.

**Stroop conversion.** Replaced `parseFloat(amount) * 10000000` (floating
point — rounds incorrectly on values like `0.1`) with a string/BigInt-based
`xlmToStroops()` helper to avoid precision bugs on payment amounts.

**Error handling.** Wrapped `getAccount`, `prepareTransaction`, and
`sendTransaction` in try/catch with human-readable messages (unfunded
account, simulation failure, network unreachable) instead of letting raw SDK
errors reach the UI.

**TS target compatibility.** `frontend/tsconfig.json` targets `ES2017`,
which doesn't support `BigInt` literal syntax (`10_000_000n`). Used
`BigInt(10000000)` instead — keep this in mind if you write more BigInt math
in this codebase.

#### Testing status

Manually tested against Freighter on testnet:

- Wallet connection flow verified (Freighter popup, correct network detection)
- Config validation fails fast with a readable error
  (`NEXT_PUBLIC_CONTRACT_ID is not configured`) before requesting a wallet
  signature, when env is unset
- `tsc --noEmit` passes clean
- **Not tested:** actual `create_link()` submission, signing, and on-chain
  confirmation. No contract is deployed to testnet yet, and there is no
  `.env.example` / `.env.local` in the repo to source a contract ID from.

#### Known limitations / blockers

This issue is explicitly blocked on
[#1 — Soroban Escrow: implement real token transfers](https://github.com/atreus-lab/atreus/issues/1)
being deployed to testnet. Until a real `PayLinkContract` is deployed and its
address is available via `NEXT_PUBLIC_CONTRACT_ID`, the full create flow
(signing → submission → confirmation → real escrow funding) cannot be
verified end-to-end. The wiring, error handling, and confirmation-polling
logic are in place and type-safe, but unverified against a live contract.

There is also no `.env.example` in the repo — worth adding one alongside this
PR documenting `NEXT_PUBLIC_CONTRACT_ID` and `NEXT_PUBLIC_TOKEN_ID`, since
this was a real point of confusion during testing.

#### Next steps for whoever picks this up

1. Confirm #1 has landed and a `PayLinkContract` is deployed to testnet
2. Set `NEXT_PUBLIC_CONTRACT_ID` (and `NEXT_PUBLIC_TOKEN_ID` if not using
   native XLM) in `.env.local`
3. Re-run the manual test flow above end-to-end with a funded testnet
   account — confirm the link preview appears and the tx is visible on
   [Stellar Expert testnet explorer](https://stellar.expert/explorer/testnet)
4. Verify the `/claim` page (separate issue) can consume the `secret`
   fragment and derive the same Poseidon hash to unlock the escrow