import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetNullifierStore } from "../lib/nullifierStore.js";

const checkNullifierOnChain = vi.fn(async () => false);
const markNullifierOnChain = vi.fn(async () => "tx-nullifier");
const submitAttestation = vi.fn(async () => "tx-attest");
const verifyClaimProof = vi.fn(async () => true);

vi.mock("../lib/stellar.js", () => ({
  createBatchEscrowTransaction: vi.fn(),
  submitAttestation,
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

afterAll(() => server ? new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) : undefined);

beforeEach(() => {
  resetNullifierStore();
  checkNullifierOnChain.mockReset().mockResolvedValue(false);
  markNullifierOnChain.mockReset().mockResolvedValue("tx-nullifier");
  submitAttestation.mockReset().mockResolvedValue("tx-attest");
  verifyClaimProof.mockReset().mockResolvedValue(true);
});

function attest(linkHash: string, nullifier: string) {
  return fetch(`${baseUrl}/api/links/${linkHash}/attest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      proof: "aa",
      link_hash: "0x" + "11".repeat(32),
      nullifier,
    }),
  });
}

describe("nullifier replay guard", () => {
  it("accepts a fresh nullifier and marks it used locally and on-chain", async () => {
    const res = await attest("cd".repeat(32), "0x" + "33".repeat(32));
    expect(res.status).toBe(200);
    expect(checkNullifierOnChain).toHaveBeenCalledTimes(1);

    // markNullifierOnChain is fired-and-forgotten after the response; give the
    // event loop a tick so the mock has actually been invoked.
    await new Promise((resolve) => setImmediate(resolve));
    expect(markNullifierOnChain).toHaveBeenCalledTimes(1);
  });

  it("rejects a replayed nullifier from the in-memory cache without an on-chain call", async () => {
    const linkHash = "ce".repeat(32);
    const nullifier = "0x" + "44".repeat(32);

    expect((await attest(linkHash, nullifier)).status).toBe(200);

    checkNullifierOnChain.mockClear();
    const second = await attest(linkHash, nullifier);
    expect(second.status).toBe(409);
    expect(checkNullifierOnChain).not.toHaveBeenCalled();
  });

  it("rejects a nullifier already marked on-chain even with an empty local cache (post-restart)", async () => {
    checkNullifierOnChain.mockResolvedValueOnce(true);

    const res = await attest("cf".repeat(32), "0x" + "55".repeat(32));
    expect(res.status).toBe(409);
    expect(verifyClaimProof).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when the on-chain nullifier check itself errors", async () => {
    checkNullifierOnChain.mockRejectedValueOnce(new Error("RPC down"));

    const res = await attest("d0".repeat(32), "0x" + "66".repeat(32));
    expect(res.status).toBe(503);
    expect(verifyClaimProof).not.toHaveBeenCalled();
  });
});
