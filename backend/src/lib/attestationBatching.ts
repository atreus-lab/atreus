import { randomBytes } from "crypto";
import {
  AttestationQueue,
  latencyBudgetFromEnv,
  sizeCapFromEnv,
  type AttestationRequest,
} from "./attestationQueue.js";
import { submitBatchAttestation, type AttestationResult } from "./stellar.js";
import { computeClaimKey, computeEmailKey, SALT_BYTES } from "./claimKey.js";
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
async function submitInstrumented(
  claims: Array<{ claimKey: Uint8Array; nullifier: Uint8Array; emailKey?: Uint8Array }>,
): Promise<string> {
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
 * Queue an attestation and resolve once its batch lands on-chain.
 *
 * Mirrors submitAttestation: it blinds the claim here (issue #118) rather than
 * making callers do it, generates the salt, and returns that salt alongside the
 * batch transaction hash. The recipient must pass the salt back to claim_link,
 * which recomputes the same claim key from its own arguments.
 *
 * One salt per claim, never one per batch: a shared salt would let anyone who
 * claimed one link recompute the claim keys of every other claim batched with
 * it, which would defeat the blinding for the whole group.
 *
 * Note the caller must NOT also call markNullifierOnChain: attest_batch records
 * the nullifier as part of the same transaction. Issuing a separate
 * mark_nullifier call would add back one transaction per claim and undo the
 * batching win.
 */
export async function enqueueAttestation(
  linkHash: Uint8Array,
  recipient: string,
  nullifier: Uint8Array,
  emailHash?: Uint8Array,
): Promise<AttestationResult> {
  const salt = randomBytes(SALT_BYTES);
  const request: AttestationRequest = {
    claimKey: computeClaimKey(linkHash, recipient, salt),
    nullifier,
    emailKey:
      emailHash && emailHash.length === 32
        ? computeEmailKey(linkHash, recipient, emailHash, salt)
        : undefined,
    claimSalt: Buffer.from(salt).toString("hex"),
  };

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
