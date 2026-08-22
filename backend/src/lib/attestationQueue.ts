import pino from "pino";

const logger = pino({ name: "attestationQueue" });

/**
 * How long an attestation may sit in the queue before the batch is flushed.
 *
 * Age is the primary trigger because latency is the real cost being managed
 * here: a recipient cannot call claim_link until their attestation has landed
 * on-chain, so every second queued is a second they are blocked.
 *
 * Note this deliberately does NOT key off signatureExpirationLedger. An
 * attestation transaction is authorized by the attester alone
 * (VerifierContract::attest_batch calls only `attester.require_auth()`), so
 * there is no recipient signature in the queue and nothing that can expire.
 * Recipients still sign and submit their own claim_link exactly as before.
 *
 * 10s is a starting point, not a measured value — there is no data yet on real
 * recipient tolerance. Tunable via ATTESTATION_BATCH_LATENCY_MS.
 */
export const DEFAULT_LATENCY_BUDGET_MS = 10_000;

/**
 * Hard ceiling on claims per batch, enforced independently of age.
 *
 * This exists because the age trigger alone is not safe: a burst of
 * attestations could build a batch past the chain's real resource limit before
 * the age trigger ever fires. Size must be able to flush on its own.
 *
 * Validated on testnet: batches of 100 both simulate and submit successfully
 * against the deployed contract, so this matches the contract's own
 * MAX_BATCH_CLAIMS rather than sitting conservatively below it.
 *
 * Worth tuning down for one reason, and it is not resource limits: batches are
 * atomic, so a single bad claim reverts the whole transaction. At 100 the blast
 * radius of one rejected claim is 99 other recipients. Measured fees are
 * essentially flat per claim regardless of batch size (~5% saving), so the gain
 * from a larger cap is fewer transactions, not cheaper ones — operators who
 * care more about isolation than transaction count should lower this via
 * ATTESTATION_BATCH_SIZE_CAP.
 */
export const DEFAULT_SIZE_CAP = 100;

/**
 * One queued attestation, already blinded (issue #118).
 *
 * The queue never sees link_hash or recipient. It carries the blinded digests
 * that go on-chain plus the salt that reopens them, which must be handed back
 * to this specific caller so their claim_link can recompute the same key.
 */
export interface AttestationRequest {
  claimKey: Uint8Array;
  nullifier: Uint8Array;
  emailKey?: Uint8Array;
  /** 64-char hex, returned to the caller that enqueued this claim. */
  claimSalt: string;
}

/** What a queued attestation resolves to once its batch lands. */
export interface QueuedAttestationResult {
  txHash: string;
  claimSalt: string;
}

export interface QueuedAttestation extends AttestationRequest {
  enqueuedAt: number;
  nullifierHex: string;
  resolve: (result: QueuedAttestationResult) => void;
  reject: (err: Error) => void;
}

/** Submits one batch on-chain and resolves to the transaction hash. */
export type BatchSubmitter = (
  claims: Array<{ claimKey: Uint8Array; nullifier: Uint8Array; emailKey?: Uint8Array }>,
) => Promise<string>;

export interface QueueOptions {
  sizeCap?: number;
  latencyBudgetMs?: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => any;
  clearTimer?: (handle: any) => void;
}

export class DuplicateNullifierError extends Error {
  constructor() {
    super("Nullifier already queued for attestation");
    this.name = "DuplicateNullifierError";
  }
}

/**
 * Batches attestations so N claims cost one on-chain transaction instead of up
 * to 3N.
 *
 * Flush policy: `queue.length >= sizeCap` OR `oldest.age > latencyBudgetMs`,
 * whichever hits first. The two triggers are independent by design — see the
 * constants above for why size must be able to fire without waiting on age.
 *
 * Batches are atomic on-chain: VerifierContract::attest_batch panics (and so
 * reverts every claim) if any single claim is bad. This class mirrors that —
 * a failed flush rejects every caller in that batch rather than reporting
 * partial success.
 */
export class AttestationQueue {
  private queue: QueuedAttestation[] = [];
  private queuedNullifiers = new Set<string>();
  private timer: any = undefined;
  private flushing = false;

  readonly sizeCap: number;
  readonly latencyBudgetMs: number;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => any;
  private readonly clearTimer: (handle: any) => void;

  constructor(private readonly submit: BatchSubmitter, options: QueueOptions = {}) {
    this.sizeCap = options.sizeCap ?? DEFAULT_SIZE_CAP;
    this.latencyBudgetMs = options.latencyBudgetMs ?? DEFAULT_LATENCY_BUDGET_MS;
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = options.clearTimer ?? ((h) => clearTimeout(h));
  }

  get depth(): number {
    return this.queue.length;
  }

  /**
   * Queue one attestation. Resolves with the batch transaction hash once the
   * batch containing it lands on-chain, or rejects if that batch fails.
   *
   * Rejects immediately if the same nullifier is already queued. The contract
   * would catch an in-batch duplicate anyway, but it does so by reverting the
   * entire batch — taking down every unrelated claim alongside it. Catching it
   * here keeps one bad request from destroying other recipients' attestations.
   */
  enqueue(request: AttestationRequest): Promise<QueuedAttestationResult> {
    const nullifierHex = Buffer.from(request.nullifier).toString("hex");
    if (this.queuedNullifiers.has(nullifierHex)) {
      return Promise.reject(new DuplicateNullifierError());
    }

    return new Promise<QueuedAttestationResult>((resolve, reject) => {
      this.queuedNullifiers.add(nullifierHex);
      this.queue.push({
        ...request,
        nullifierHex,
        enqueuedAt: this.now(),
        resolve,
        reject,
      });

      if (this.queue.length >= this.sizeCap) {
        void this.flush("size");
      } else {
        this.scheduleAgeFlush();
      }
    });
  }

  /**
   * Arm a timer for whatever remains of the oldest entry's latency budget.
   * Keyed off the OLDEST entry, not the newest, so a steady trickle of new
   * arrivals can never keep pushing the deadline out and starve the first
   * caller.
   */
  private scheduleAgeFlush(): void {
    if (this.timer !== undefined || this.queue.length === 0) return;
    const oldest = this.queue[0];
    const elapsed = this.now() - oldest.enqueuedAt;
    const remaining = Math.max(0, this.latencyBudgetMs - elapsed);
    this.timer = this.setTimer(() => {
      this.timer = undefined;
      void this.flush("age");
    }, remaining);
  }

  /**
   * Submit everything currently queued as one batch.
   *
   * Takes the whole queue up front so entries arriving mid-flight land in the
   * next batch rather than joining one already in flight. `flushing` guards
   * against a size- and age-trigger firing concurrently.
   */
  async flush(reason: "size" | "age" | "manual" = "manual"): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;

    if (this.timer !== undefined) {
      this.clearTimer(this.timer);
      this.timer = undefined;
    }

    const batch = this.queue;
    this.queue = [];
    for (const entry of batch) {
      this.queuedNullifiers.delete(entry.nullifierHex);
    }

    const oldestAgeMs = this.now() - batch[0].enqueuedAt;
    logger.info(
      { reason, size: batch.length, oldestAgeMs, sizeCap: this.sizeCap },
      "flushing attestation batch",
    );

    try {
      const txHash = await this.submit(
        batch.map(({ claimKey, nullifier, emailKey }) => ({ claimKey, nullifier, emailKey })),
      );
      // Each caller gets its own salt back, not just the shared tx hash — the
      // salt is what lets that recipient reopen their blinded claim key.
      for (const entry of batch) entry.resolve({ txHash, claimSalt: entry.claimSalt });
      logger.info({ reason, size: batch.length, txHash }, "attestation batch submitted");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // The on-chain call is atomic, so a failure means no claim in this batch
      // was recorded. Reject every caller rather than implying partial success.
      for (const entry of batch) entry.reject(error);
      logger.error(
        { reason, size: batch.length, error: error.message },
        "attestation batch failed",
      );
    } finally {
      this.flushing = false;
      // Entries that arrived while this flush was in flight still need to be
      // dealt with. If enough of them piled up to hit the cap, send them now:
      // making them serve out a full latency budget would let a burst sit
      // queued behind a batch that has already completed.
      if (this.queue.length >= this.sizeCap) {
        void this.flush('size');
      } else {
        this.scheduleAgeFlush();
      }
    }
  }
}

export function sizeCapFromEnv(): number {
  const raw = Number(process.env.ATTESTATION_BATCH_SIZE_CAP);
  return Number.isSafeInteger(raw) && raw > 0 ? raw : DEFAULT_SIZE_CAP;
}

export function latencyBudgetFromEnv(): number {
  const raw = Number(process.env.ATTESTATION_BATCH_LATENCY_MS);
  return Number.isSafeInteger(raw) && raw > 0 ? raw : DEFAULT_LATENCY_BUDGET_MS;
}
