import {
  AttestationQueue,
  latencyBudgetFromEnv,
  sizeCapFromEnv,
  type AttestationRequest,
} from "./attestationQueue.js";
import { submitBatchAttestation } from "./stellar.js";
import {
  attestationBatchSize,
  attestationFeeStroops,
  attestationQueueDepth,
  attestationTxCounter,
} from "../routes/monitoring.js";

/**
 * Fee (stroops) set on an attester transaction. Mirrors the value used when
 * building both submitAttestation and submitBatchAttestation, and is what the
 * fee-estimate metric accounts against.
 */
const ATTESTER_TX_FEE_STROOPS = 200_000;

/**
 * Attestation batching is opt-in. Existing deployments keep the per-claim path
 * (one to three attester transactions per claim) until this is switched on, so
 * enabling batching is a deliberate operational decision rather than something
 * that changes under a running system on upgrade.
 */
export function isBatchingEnabled(): boolean {
  return process.env.ATTESTATION_BATCHING === "true";
}

let queue: AttestationQueue | undefined;

/**
 * Instrumented batch submitter. Records one transaction and its fee per batch,
 * against the batch size — this is what makes the per-link vs batched
 * comparison measurable from real runs instead of estimated.
 */
async function submitInstrumented(claims: AttestationRequest[]): Promise<string> {
  attestationBatchSize.observe(claims.length);
  try {
    const txHash = await submitBatchAttestation(claims);
    attestationTxCounter.inc({ mode: "batched", status: "success" });
    attestationFeeStroops.inc({ mode: "batched" }, ATTESTER_TX_FEE_STROOPS);
    return txHash;
  } catch (err) {
    attestationTxCounter.inc({ mode: "batched", status: "failed" });
    // The transaction is still submitted (and paid for) when it fails on-chain
    // rather than being rejected outright, so count the fee either way.
    attestationFeeStroops.inc({ mode: "batched" }, ATTESTER_TX_FEE_STROOPS);
    throw err;
  }
}

export function getAttestationQueue(): AttestationQueue {
  if (!queue) {
    queue = new AttestationQueue(submitInstrumented, {
      sizeCap: sizeCapFromEnv(),
      latencyBudgetMs: latencyBudgetFromEnv(),
    });
  }
  return queue;
}

/**
 * Queue an attestation and resolve with the batch transaction hash.
 *
 * Note the caller must NOT also call markNullifierOnChain: attest_batch records
 * the nullifier as part of the same transaction. Issuing a separate
 * mark_nullifier call would add back one transaction per claim and undo the
 * batching win.
 */
export async function enqueueAttestation(request: AttestationRequest): Promise<string> {
  const q = getAttestationQueue();
  const promise = q.enqueue(request);
  attestationQueueDepth.set(q.depth);
  try {
    return await promise;
  } finally {
    attestationQueueDepth.set(q.depth);
  }
}

/** Test-only: drop the singleton so options are re-read from the environment. */
export function resetAttestationQueueForTests(): void {
  queue = undefined;
}

export { ATTESTER_TX_FEE_STROOPS };
