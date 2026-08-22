import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetNullifierStore } from "../lib/nullifierStore.js";

const checkNullifierOnChain = vi.fn(async () => false);
const markNullifierOnChain = vi.fn(async () => "tx-nullifier");
const submitAttestation = vi.fn(async () => "tx-attest");
type BatchClaimArg = { linkHash: Uint8Array; recipient: string; nullifier: Uint8Array; emailHash?: Uint8Array };
const submitBatchAttestation = vi.fn(async (_claims: BatchClaimArg[]) => "tx-batch");
const verifyClaimProof = vi.fn(async () => true);

vi.mock("../lib/stellar.js", () => ({
  createBatchEscrowTransaction: vi.fn(),
  submitAttestation,
  submitBatchAttestation,
  checkNullifierOnChain,
  markNullifierOnChain,
}));

vi.mock("../lib/zk.js", () => ({
  sha256Hex: vi.fn(),
  verifyClaimProof,
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.VERCEL = "1";
  // Must be set before the queue singleton is constructed on first request.
  process.env.ATTESTATION_BATCHING = "true";
  process.env.ATTESTATION_BATCH_SIZE_CAP = "3";
  process.env.ATTESTATION_BATCH_LATENCY_MS = "50";

  const { default: app } = await import("../index.js");
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No test port");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
}, 30_000);

afterAll(async () => {
  delete process.env.ATTESTATION_BATCHING;
  delete process.env.ATTESTATION_BATCH_SIZE_CAP;
  delete process.env.ATTESTATION_BATCH_LATENCY_MS;
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

beforeEach(() => {
  resetNullifierStore();
  checkNullifierOnChain.mockReset().mockResolvedValue(false);
  markNullifierOnChain.mockReset().mockResolvedValue("tx-nullifier");
  submitAttestation.mockReset().mockResolvedValue("tx-attest");
  submitBatchAttestation.mockReset().mockResolvedValue("tx-batch");
  verifyClaimProof.mockReset().mockResolvedValue(true);
});

function attest(linkHash: string, nullifier: string, emailHash?: string) {
  return fetch(`${baseUrl}/api/links/${linkHash}/attest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      proof: "aa",
      link_hash: "0x" + "11".repeat(32),
      nullifier,
      ...(emailHash ? { recipient_email_hash: emailHash } : {}),
    }),
  });
}

const hex = (n: number) => n.toString(16).padStart(2, "0").repeat(32);

describe("batched attestation", () => {
  it("collapses N attestations into a single on-chain transaction", async () => {
    const responses = await Promise.all([
      attest(hex(0xa1), "0x" + hex(0xb1)),
      attest(hex(0xa2), "0x" + hex(0xb2)),
      attest(hex(0xa3), "0x" + hex(0xb3)),
    ]);

    for (const res of responses) expect(res.status).toBe(200);
    for (const res of responses) {
      const body = (await res.json()) as { attestationTx?: string };
      expect(body.attestationTx).toBe("tx-batch");
    }

    // Three claims, one transaction — the whole point of the feature.
    expect(submitBatchAttestation).toHaveBeenCalledTimes(1);
    expect(submitBatchAttestation.mock.calls[0][0]).toHaveLength(3);

    // The per-claim path must not also run.
    expect(submitAttestation).not.toHaveBeenCalled();
  });

  it("does not issue a separate mark_nullifier transaction", async () => {
    await Promise.all([
      attest(hex(0xc1), "0x" + hex(0xd1)),
      attest(hex(0xc2), "0x" + hex(0xd2)),
      attest(hex(0xc3), "0x" + hex(0xd3)),
    ]);
    await new Promise((resolve) => setImmediate(resolve));

    // attest_batch records nullifiers in the same transaction. A separate
    // mark_nullifier call would add one transaction per claim and undo the win.
    expect(markNullifierOnChain).not.toHaveBeenCalled();
  });

  it("still rejects a replayed nullifier before it reaches the batch", async () => {
    // Fill and flush a batch containing this nullifier.
    const nullifier = "0x" + hex(0xe1);
    await Promise.all([
      attest(hex(0xf1), nullifier),
      attest(hex(0xf2), "0x" + hex(0xe2)),
      attest(hex(0xf3), "0x" + hex(0xe3)),
    ]);
    expect(submitBatchAttestation).toHaveBeenCalledTimes(1);

    const replay = await attest(hex(0xf4), nullifier);
    expect(replay.status).toBe(409);
    // No second batch was submitted for the replay.
    expect(submitBatchAttestation).toHaveBeenCalledTimes(1);
  });

  it("still rejects an unverified email hash on an email-restricted claim", async () => {
    const res = await attest(hex(0xaa), "0x" + hex(0xbb), "cc".repeat(32));
    expect(res.status).toBe(403);
    expect(submitBatchAttestation).not.toHaveBeenCalled();
  });

  it("still rejects an invalid proof before queueing", async () => {
    verifyClaimProof.mockResolvedValueOnce(false);
    const res = await attest(hex(0x11), "0x" + hex(0x22));
    expect(res.status).toBe(400);
    expect(submitBatchAttestation).not.toHaveBeenCalled();
  });

  it("flushes a partial batch on the age trigger", async () => {
    // Only one claim — below the size cap of 3, so this can only land via age.
    const res = await attest(hex(0x31), "0x" + hex(0x41));
    expect(res.status).toBe(200);
    expect(submitBatchAttestation).toHaveBeenCalledTimes(1);
    expect(submitBatchAttestation.mock.calls[0][0]).toHaveLength(1);
  });

  it("fails every claim in a batch when the transaction fails", async () => {
    submitBatchAttestation.mockRejectedValue(new Error("batch reverted"));

    const responses = await Promise.all([
      attest(hex(0x51), "0x" + hex(0x61)),
      attest(hex(0x52), "0x" + hex(0x62)),
      attest(hex(0x53), "0x" + hex(0x63)),
    ]);

    // Atomic on-chain: no caller may be told their claim landed.
    for (const res of responses) expect(res.status).toBe(500);
  });
});
