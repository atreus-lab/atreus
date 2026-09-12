import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetNullifierStore } from "../lib/nullifierStore.js";

// Blinded attestation: the backend returns the salt so the client can reopen the key.
const CLAIM_SALT = "22".repeat(32);
const ATTESTATION = { txHash: "tx-attest", claimSalt: CLAIM_SALT };

const checkNullifierOnChain = vi.fn(async () => false);
const markNullifierOnChain = vi.fn(async () => "tx-nullifier");
const submitAttestation = vi.fn(async () => ATTESTATION);
const verifyClaimProof = vi.fn(async () => true);
const getLinkInfo = vi.fn();

vi.mock("../lib/stellar.js", () => ({
  createBatchEscrowTransaction: vi.fn(),
  submitAttestation,
  checkNullifierOnChain,
  markNullifierOnChain,
  getLinkInfo,
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
  submitAttestation.mockReset().mockResolvedValue(ATTESTATION);
  verifyClaimProof.mockReset().mockResolvedValue(true);
  getLinkInfo.mockReset();
});

const RECIPIENT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function attest(linkHash: string, nullifier: string) {
  return fetch(`${baseUrl}/api/links/${linkHash}/attest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipient: RECIPIENT,
      proof: "aa",
      link_hash: "0x" + "11".repeat(32),
      nullifier,
    }),
  });
}

describe("GET /api/links/:hash", () => {
  it("never discloses the creator", async () => {
    getLinkInfo.mockResolvedValueOnce({
      creator: "GCREATORAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      amount: 100_000_000n,
      asset: "CASSET",
      policyType: 0,
      policyParams: "",
      expiresAt: 1_700_000_000n,
      claimed: false,
    });
    const hash = "ab".repeat(32);
    const res = await fetch(`${baseUrl}/api/links/${hash}`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).not.toHaveProperty("creator");
    expect(JSON.stringify(body)).not.toContain("GCREATOR");
    expect(body).toMatchObject({ hash, amount: "100000000", asset: "CASSET", policyType: 0, claimed: false });
  });
});

describe("attest response", () => {
  it("returns the claim salt as 64 hex chars alongside the attestation tx", async () => {
    const res = await attest("c0".repeat(32), "0x" + "31".repeat(32));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; attestationTx: string; claimSalt: string; recipient: string };
    expect(body.success).toBe(true);
    expect(body.attestationTx).toBe("tx-attest");
    expect(body.claimSalt).toMatch(/^[0-9a-f]{64}$/);
    expect(body.claimSalt).toBe(CLAIM_SALT);
  });

  it("passes the link hash and recipient to submitAttestation, not a blinded key", async () => {
    const linkHash = "c1".repeat(32);
    await attest(linkHash, "0x" + "32".repeat(32));
    expect(submitAttestation).toHaveBeenCalledTimes(1);
    const [linkHashArg, recipientArg] = submitAttestation.mock.calls[0] as unknown as [Uint8Array, string];
    expect(Buffer.from(linkHashArg).toString("hex")).toBe(linkHash);
    expect(recipientArg).toBe(RECIPIENT);
  });
});

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
