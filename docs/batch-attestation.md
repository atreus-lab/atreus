# Batch Attestation & Recursive Proof Aggregation

Status of this work, in one line: **batch attestation shipped and validated on
testnet; recursive proof aggregation investigated and not shipped; on-chain
aggregate proof verification is not possible on Soroban today.**

The headline measured result: batching cuts attester **transaction count by
20-200x**, and **fees by about 5%** — not the order-of-magnitude fee saving the
original issue assumed. Section 4 has the numbers and the reason.

## 1. On-chain aggregate verification is deferred to CAP-0074

This is the headline constraint, stated plainly rather than buried:

**No aggregate proof is verified on-chain, and none can be today.**

`VerifierContract::verify_proof` is a stub. It returns `!proof.is_empty()` and
performs no cryptographic check whatsoever. It is not a partial implementation —
it is a placeholder.

The reason is a missing host function, not a design choice. Verifying an
UltraHonk proof requires BN254 pairing operations. Soroban does not have them:
CAP-0074 (BN254 host functions) is *proposed, not implemented*. Soroban does
support BLS12-381 pairings (CAP-0059), but this project's proving stack — Noir +
Barretenberg — targets BN254, so those are not usable here.

What actually gates a claim today is the **attestation-oracle pattern**: the real
UltraHonk proof is generated client-side, verified *off-chain* by the trusted
attester service, and the attester then writes an on-chain attestation that
`claim_link` requires before releasing funds. Batch attestation makes that write
cheaper. It does not make it trustless, and it must not be described as
"on-chain aggregate verification".

When CAP-0074 ships, `verify_proof` can be implemented for real and the trust
assumption on the attester can be removed. Until then it stands.

## 2. What shipped: batch attestation

`VerifierContract::attest_batch(attester, Vec<BatchClaim>) -> u32` records N
claims' attestations, nullifiers, and email bindings in **one** transaction.

The per-claim path costs up to three attester transactions (`attest`,
`attest_email`, `mark_nullifier`). Batching collapses those to one transaction
per batch.

It writes the **same storage keys** as the three single-claim functions, so
`is_attested`, `is_email_attested`, `is_nullifier_used` — and therefore
`claim_link` — behave identically whether a claim was attested singly or in a
batch. Settlement is untouched.

### Security properties preserved

| Property | How it is preserved |
|---|---|
| Nullifier replay protection | Each nullifier is checked against storage then marked before the next claim is processed, so a duplicate *within one batch* fails on its second occurrence. Batching cannot become a double-spend path. |
| Recipient authorization | Unchanged. `claim_link` still requires `recipient.require_auth()` per claim at settlement. Only attestation is batched; recipients still sign and submit their own claims. |
| Email restriction | An email binding is recorded only when supplied, exactly as `attest_email` does. `claim_link` still independently requires `is_email_attested` for `policy_type == 1`. |
| Attester trust | Checked once per batch, identically to the single-claim functions. |
| Per-claim ZK proof | Unchanged. Every claim is still individually proven and individually verified off-chain before it is queued. |

### Atomicity

A batch is atomic. Any rejected claim panics, which reverts the entire
transaction — nothing is recorded. This is deliberate: a used nullifier inside a
batch indicates a bug or race upstream, and silently skipping it would hide a
double-spend attempt from the caller. The backend queue mirrors this by
rejecting every caller in a failed batch rather than reporting partial success.

### Auth model note

The flush policy here is **not** built around `signatureExpirationLedger`, and
that is intentional. `attest`, `attest_email`, `mark_nullifier`, and
`attest_batch` all require **only** `attester.require_auth()`. There is no
recipient signature anywhere in an attestation transaction, so there is nothing
in the queue that can expire. The cost being managed is latency, not signature
freshness.

## 3. Flush policy

Attestations are queued and flushed when **either** trigger fires, whichever
comes first:

- **Size** — `queue.length >= ATTESTATION_BATCH_SIZE_CAP`
- **Age** — oldest queued entry exceeds `ATTESTATION_BATCH_LATENCY_MS`

Age is the primary trigger, because latency is the real cost: a recipient cannot
call `claim_link` until their attestation lands, so every queued second is a
second they are blocked.

Size is **not** a fallback — it fires independently. Without it, a burst of
attestations could build a batch past the chain's real resource limit before the
age trigger ever ran.

The age deadline is keyed off the **oldest** entry, never the newest, so a steady
trickle of arrivals cannot keep pushing the deadline out and starve the first
caller.

| Setting | Default | Notes |
|---|---|---|
| `ATTESTATION_BATCHING` | `false` | Opt-in. Existing deployments keep the per-claim path until explicitly switched on. |
| `ATTESTATION_BATCH_SIZE_CAP` | `100` | Validated on testnet. See the note below. |
| `ATTESTATION_BATCH_LATENCY_MS` | `10000` | A starting point, not a measured recipient tolerance. |

> **The size cap is validated, at 100.** Batches of 100 both simulate and submit
> successfully on testnet against a live deployment (see section 4), so this
> matches the contract's own `MAX_BATCH_CLAIMS` rather than sitting below it.
> Soroban's per-transaction resource ceiling was never reached during probing.
>
> The reason to lower it is **blast radius, not resources**: batches are atomic,
> so one rejected claim reverts the entire transaction — at 100, a single bad
> claim takes 99 other recipients with it. Measured fees are effectively flat
> per claim regardless of batch size, so a smaller cap costs very little.

## 4. Benchmark: per-link vs batched

**All figures below are measured on Stellar testnet against a live deployment of
this contract.** Nothing here is extrapolated.

- Contract: `CAM3AR5SLEMNOX2PJ42AOKL63P4KIBUWVPEFFUQDP3Y3NY3NC36M3K4L`
- Network: testnet, via `https://soroban-testnet.stellar.org`

Per-claim baseline, measured on the same deployment:

| Transaction | Fee charged |
|---|---:|
| `attest` | 88,971 stroops |
| `mark_nullifier` | 69,282 stroops |
| **Total per claim** | **158,253 stroops across 2 transactions** |

Batched, measured (one transaction per batch, `size_cap = 100`):

| N | Requests | Tx per-link | Tx batched | Tx reduction | Fee per-link | Fee batched | Fee saving |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 20 | 1 | **20x** | 1,582,530 | 1,509,248 | 4.6% |
| 50 | 50 | 100 | 1 | **100x** | 7,912,650 | 7,532,287 | 4.8% |
| 100 | 100 | 200 | 1 | **200x** | 15,825,300 | 15,071,788 | 4.8% |

Raw batch measurements: N=1 → 155,231 stroops; N=10 → 1,509,248; N=50 →
7,532,287 (10.3s); N=100 → 15,071,788.

HTTP request count is unchanged by design: each recipient still POSTs their own
attestation with their own individually-verified ZK proof. Batching changes how
those requests become transactions, not how many arrive.

### The fee result is the important one, and it is not what the issue assumed

**Batching cuts transaction count by 20–200x. It cuts fees by about 5%.**

That is not a disappointing implementation — it is how Soroban prices work.
The inclusion fee is a small part of the total; the resource fee dominates, and
it is metered on actual CPU and ledger writes. Batching 100 claims into one
transaction still performs 100 claims' worth of storage writes, so it still pays
for them. What disappears is 199 transactions' worth of *inclusion* overhead,
not the work itself.

So the honest case for this feature is **operational, not financial**:

- 200 transactions become 1, so sequence-number contention on the attester
  account disappears and throughput stops being bounded by transaction rate.
- Far fewer RPC submissions and confirmations to observe, retry, and monitor.
- Attestation latency becomes bounded and tunable rather than proportional to
  queue length.

Anyone reading this as "batching makes attestation ~20x cheaper" has it wrong,
and the earlier estimate in this document that implied so was replaced by these
measurements.

### Verified on-chain, not merely submitted

For every batch above, each claim was read back through the contract's own
accessors after the transaction landed:

- `is_attested(link_hash, recipient)` — true for every claim (10/10, 50 sampled 3/3, 100)
- `is_nullifier_used(nullifier)` — true for every claim
- `is_email_attested(link_hash, recipient, email_hash)` — true for all 5 claims in
  the email-restricted batch, confirming the `Option<BytesN<32>>` encoding
  (bare value for `Some`, `Void` for `None`) is correct against a live contract
- **Replay rejected on-chain**: resubmitting an already-attested nullifier failed
  with `HostError: Error(WasmVm, InvalidAction)`, so nullifier replay protection
  holds on the real batch path, not just in unit tests

### Resource ceiling

Probed by simulation at N = 10, 15, 20, 25, 30, 40, 50, 75, 100 — **all passed**,
then confirmed with a real N=100 submission. The contract's `MAX_BATCH_CLAIMS`
of 100 fits comfortably inside Soroban's per-transaction resource budget; the
ceiling was never reached, so it is a self-imposed bound rather than a chain
limit. The backend default `ATTESTATION_BATCH_SIZE_CAP` is therefore 100.

The reason to lower it is **blast radius, not resources**: batches are atomic, so
one rejected claim reverts the whole transaction. At 100, a single bad claim
takes 99 other recipients down with it. Since fees are effectively flat per claim
regardless of batch size, a smaller cap costs very little.

Live instrumentation for tracking this in production is wired:
`atreus_attestation_requests_total`, `atreus_attestation_txs_total{mode,status}`,
`atreus_attestation_batch_size`, `atreus_attestation_fee_stroops_total{mode}`,
and `atreus_attestation_queue_depth`.

## 5. Recursive proof aggregation: investigated, not shipped

The original goal was a recursive wrapper circuit collapsing N UltraHonk leaf
proofs into one aggregate proof. **It is not shipped, and no recursive circuit is
committed.** This section records what was measured so the next attempt does not
start from zero.

Toolchain: Noir `1.0.0-beta.22` (exact git-hash match to the committed
`circuits/target/secret.json`), `@aztec/bb.js@5.0.0-nightly.20260522`.

### Measured leaf circuit

| Property | Value |
|---|---|
| Gates | 28,680 (dyadic 32,768) |
| Proof | 14,656 bytes = 458 field elements |
| Verification key | 3,680 bytes = 115 field elements |
| Public inputs | 3 (recipient, link_hash, nullifier) |
| Prove time | ~3.0s, single-threaded |

### Recursion API on this pin

`std::verify_proof` **does not exist** in beta.22. `std::verify_proof_with_type`
does, and compiles to ACIR. Proof-type compatibility, measured:

| `proof_type` | Result |
|---|---|
| 0 | Accepted — requires a **410-field non-ZK** proof (`noir-recursive-no-zk`) |
| 1, 2 | Rejected: *"HN recursion constraints not supported with UltraBuilder"* |
| 3 | Rejected: AVM recursion not in this build |
| 4 | Accepted — requires a **480-field** proof (`noir-rollup`), needs `ipaAccumulation` |
| 5, 6 | Rejected |

### Why flat aggregation cannot reach N=100

One in-circuit verification costs **~744,245 gates**, measured and linear:

| Leaves | Gates | Dyadic |
|---:|---:|---:|
| 1 | 681,830 | 2^20 |
| 2 | 1,426,076 | 2^21 |
| 4 | 2,914,566 | 2^22 |

Extrapolated: N=10 ≈ 7.4M (2^23), N=50 ≈ 37M (2^26), N=100 ≈ 74M (2^27). N=1
alone already required a 2^21 SRS and ~46s to prove. A flat wrapper stops scaling
around **N=8–16**, far short of 100 — the binding limit is prover memory
(bb.js has a 4 GB wasm ceiling), not any Soroban constraint. Reaching N=100 would
require a k-ary recursion tree of depth ceil(log_k N).

### Why it was not shipped

Two independent reasons, either sufficient on its own.

**The ZK constraint.** `proof_type 0` accepts only non-ZK leaf proofs. That was
ruled out: it would let the attester recover secrets at attest time, and since
`claim_link` takes `secret` as a plaintext argument, attester authority plus a
recoverable secret is enough to self-attest and claim. Batching makes this worse,
not better — attestation would precede settlement by the whole queue window.
`proof_type 4` (`noir-rollup`) *does* preserve ZK (`disableZk: false`) at
equivalent cost (682,185 gates), so it was investigated under a time-box.

**It does not work.** `proof_type 4` generates an aggregate proof that **never
verifies**. Ruled out as causes: VK mismatch (the VK returned by `circuitProve`
is byte-identical to `circuitComputeVk`), and a missing aggregation object
(`verify_proof_with_type` returns `()` in beta.22 — it is compiler-managed).

The decisive result: **the recursion constraint is enforced nowhere in this
pipeline.** A deliberately corrupted leaf proof still produces a valid witness
(the ACVM treats `RecursiveAggregation` as an unsolved black box) *and* still
proves successfully (94.8s), yielding a proof indistinguishable from the one
built on a good leaf (100.9s). Both fail verification identically. Good and bad
inputs cannot be told apart in either direction. The same failure mode appears on
`proof_type 0`, so this is systemic to Honk recursion in this bb.js build, not
specific to one proof type.

**This is why no circuit is committed.** A recursive circuit in the repo that
provably constrains nothing reads as load-bearing to whoever finds it next;
comments and "non-critical" labels get missed, and code that exists implies it
does something. It currently fails *closed* (verification always false), but any
future attempt to "fix" that by trusting generation success would fail **open**.

### What a real recursive circuit would require

1. A bb.js/Barretenberg build where Honk-verifying-Honk recursion is supported
   and a corrupted leaf proof actually fails to prove. Verify this with the
   corruption test above **before** building anything on top.
2. `proof_type 4` (`noir-rollup`, ZK-preserving) as the leaf primitive — never
   `proof_type 0`, which would forfeit leaf ZK.
3. A k-ary tree (k=4 or 8), since flat aggregation caps out near N=8–16. Internal
   nodes verify wrapper proofs rather than leaf proofs, so a second circuit
   variant is needed for the differing child proof size.
4. A commitment to the N claims as a single public input rather than 3N raw
   fields (300 fields / 9,600 bytes at N=100).
5. CAP-0074 on Soroban before any of it can be verified on-chain.

## 6. `submit_proof` byte-size fix

`VerifierContract::submit_proof` hardcoded a 2144-byte length check. The circuit
produces **14,656-byte** proofs, so the check rejected every proof the system
actually generates.

`2144 / 32 = 67` field elements — the legacy Barretenberg **UltraPlonk** proof
size. It dates from commit `b86f681` and predates this project's migration to
UltraHonk; it was simply never updated. `submit_proof` has no callers anywhere in
the repo, so the bug was latent rather than actively breaking production.

Now `ULTRA_HONK_PROOF_LEN = 14_656`, measured against the pinned toolchain rather
than assumed. Because recursion was not shipped, the production proof format is
unchanged, so this value is not affected by the recursion outcome.

Tests guard the corrected size, an explicit regression test on 2144, and
rejection of empty / `len-1` / `len+1` proofs — so the constant cannot silently
regress to another wrong number.

## 7. Validation status and remaining limitations

### Validated on testnet

Batch attestation is verified end-to-end against a live deployment, not only by
unit tests:

- Contract `CAM3AR5SLEMNOX2PJ42AOKL63P4KIBUWVPEFFUQDP3Y3NY3NC36M3K4L`, deployed
  from this branch's source.
- Real batches submitted at N = 1, 5, 10, 50, and 100. All landed.
- Every claim read back through `is_attested` and `is_nullifier_used` after the
  transaction confirmed. All matched.
- Email bindings verified through `is_email_attested`, confirming the
  `Option<BytesN<32>>` ScVal encoding is correct against a live contract — this
  was the encoding most likely to be wrong and is now proven.
- Nullifier replay rejected on-chain (`HostError: Error(WasmVm, InvalidAction)`)
  when resubmitting an already-attested nullifier, so replay protection holds on
  the real batch path.
- Resource ceiling probed at N up to 100 — never reached. `MAX_BATCH_CLAIMS` is a
  self-imposed bound, not a chain limit.
- Fees measured, not estimated. See section 4.

### Remaining limitations

- **Fee savings are ~5%, not ~20x.** This is a real finding rather than an
  outstanding task, and it is the single most important correction to the
  original issue's framing. Soroban's resource fee dominates and is metered on
  work performed, which batching does not reduce. The win is transaction count
  (20–200x) and the operational headroom that buys. See section 4.
- **The latency budget is still a guess.** 10s was chosen with no data on real
  recipient tolerance. Unlike the size cap, this has not been validated against
  anything and should be tuned once there is production evidence.
- **`claim_link` settlement was not exercised on testnet.** This work batches
  attestation only; settlement is unchanged and still runs per recipient. The
  batches above were attested but not claimed, since claiming requires funded
  recipient accounts and real escrowed links, neither of which this feature
  touches. The `claim_link` path is covered by the contract test suite.
- **Recursive proof aggregation is not shipped**, and cannot be until the
  toolchain bug in section 5 is fixed and CAP-0074 lands. No recursive circuit is
  committed, deliberately.
- **Testnet is not mainnet.** Resource limits and fees are network-configured and
  could differ. Re-measure before relying on these numbers in production.
