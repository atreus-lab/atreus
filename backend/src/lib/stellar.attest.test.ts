import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the SDK at the module boundary so submitAttestation builds a transaction we can
// inspect without touching the network. Factories are hoisted above top-level consts,
// so everything they reference must live in vi.hoisted().
const { getAccount, prepareTransaction, sendTransaction, getTransaction, sign, calls, ATTESTER } = vi.hoisted(() => ({
  getAccount: vi.fn(async () => ({})),
  prepareTransaction: vi.fn(async (tx: any) => tx),
  sendTransaction: vi.fn(async () => ({ status: "PENDING", hash: "tx-hash-abc" })),
  getTransaction: vi.fn(async () => ({ status: "SUCCESS" })),
  sign: vi.fn(),
  calls: [] as any[][],
  ATTESTER: "G" + "B".repeat(55),
}));

vi.mock("@stellar/stellar-sdk/rpc", () => ({ Durability: { Persistent: "persistent" } }));
// A complete fake, not a spread over the real SDK: nothing here needs the real
// implementation, and skipping it keeps this suite off the SDK's parse cost.
vi.mock("@stellar/stellar-sdk", () => {
  return {
    Horizon: { Server: class {} },
    Networks: { TESTNET: "Test SDF Network ; September 2015" },
    Asset: { native: () => ({}) },
    Account: class { constructor(_id: string, _seq: string) {} },
    nativeToScVal: (v: any) => v,
    scValToNative: (v: any) => v,
    rpc: {
      Server: class {
        getAccount = getAccount;
        prepareTransaction = prepareTransaction;
        sendTransaction = sendTransaction;
        getTransaction = getTransaction;
        getContractData = vi.fn();
      },
      Api: { GetTransactionStatus: { SUCCESS: "SUCCESS", FAILED: "FAILED" } },
    },
    Address: class {
      constructor(private addr: string) {}
      toScVal() { return { _arm: "address", _value: this.addr }; }
    },
    Contract: class {
      constructor(private id: string) {}
      call(name: string, ...args: any[]) { calls.push([name, ...args]); return { name, args }; }
    },
    Keypair: { fromSecret: () => ({ publicKey: () => ATTESTER }) },
    TransactionBuilder: class {
      private tx: any = { operations: [] as any[], sign };
      constructor(_account: any, _opts: any) {}
      addOperation(op: any) { this.tx.operations.push(op); return this; }
      setTimeout() { return this; }
      build() { return this.tx; }
    },
    xdr: { ScVal: { scvBytes: (b: Buffer) => ({ _arm: "bytes", _value: b }) } },
  };
});

import { submitAttestation } from "./stellar.js";
import { computeClaimKey, computeEmailKey } from "./claimKey.js";

const LINK_HASH = Buffer.alloc(32, 0x11);
const RECIPIENT = "G" + "A".repeat(55);
const EMAIL_HASH = Buffer.alloc(32, 0x33);

describe("submitAttestation", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID = "CVERIFIER";
    process.env.ATTESTER_SECRET_KEY = "SSECRET";
    calls.length = 0;
    getTransaction.mockClear();
  });

  it("submits attest(attester, claim_key) and returns the salt as 64 hex chars", async () => {
    const result = await submitAttestation(LINK_HASH, RECIPIENT);

    expect(result.txHash).toBe("tx-hash-abc");
    expect(result.claimSalt).toMatch(/^[0-9a-f]{64}$/);

    expect(calls).toHaveLength(1);
    const [name, attester, claimKey] = calls[0];
    expect(name).toBe("attest");
    expect(attester).toEqual({ _arm: "address", _value: ATTESTER });
    const salt = Buffer.from(result.claimSalt, "hex");
    expect(claimKey._value.toString("hex")).toBe(computeClaimKey(LINK_HASH, RECIPIENT, salt).toString("hex"));
  });

  it("leaks neither the link hash nor the recipient into the transaction", async () => {
    await submitAttestation(LINK_HASH, RECIPIENT, EMAIL_HASH);
    const serialized = JSON.stringify(calls.map(c => c.map(a => (a?._value?.toString ? a._value.toString("hex") : a))));
    expect(serialized).not.toContain(LINK_HASH.toString("hex"));
    expect(serialized).not.toContain(RECIPIENT);
    expect(serialized).not.toContain(EMAIL_HASH.toString("hex"));
  });

  it("adds attest_email(attester, email_key) under the same salt", async () => {
    const result = await submitAttestation(LINK_HASH, RECIPIENT, EMAIL_HASH);
    const salt = Buffer.from(result.claimSalt, "hex");

    expect(calls.map(c => c[0])).toEqual(["attest", "attest_email"]);
    expect(calls[0][2]._value.toString("hex")).toBe(computeClaimKey(LINK_HASH, RECIPIENT, salt).toString("hex"));
    expect(calls[1][2]._value.toString("hex")).toBe(computeEmailKey(LINK_HASH, RECIPIENT, EMAIL_HASH, salt).toString("hex"));
  });

  it("draws a fresh salt per attestation so two attests are unlinkable", async () => {
    const first = await submitAttestation(LINK_HASH, RECIPIENT);
    const second = await submitAttestation(LINK_HASH, RECIPIENT);
    expect(first.claimSalt).not.toBe(second.claimSalt);
    expect(calls[0][2]._value.toString("hex")).not.toBe(calls[1][2]._value.toString("hex"));
  });

  it("rejects a recipient that is not a 56-char strkey before hashing", async () => {
    await expect(submitAttestation(LINK_HASH, "GSHORT")).rejects.toThrow(/56-char Stellar strkey/);
    expect(calls).toHaveLength(0);
  });
});
