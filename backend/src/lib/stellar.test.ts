import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a fake ScMap that mimics what `rpcServer.getContractData` returns for a
// stored LinkInfo: an entry whose `.val.contractData().val()` is an object with a
// `.map()` method returning Symbol-keyed entries.
function makeMapEntry(entries: Array<[string, any]>): any {
  return {
    val: {
      contractData: () => ({
        val: () => ({
          map: () => entries.map(([name, val]) => ({
            _attributes: {
              key: { _arm: "sym", _value: Buffer.from(name, "utf8") },
              val,
            },
          })),
        }),
      }),
    },
  };
}

function scvAddress(addr: string): any {
  // Lazy import Address lazily inside the test so the test doesn't need a
  // hard dependency on the real toScVal format. The decoder only needs the
  // `_arm === "address"` discriminator, but `Address.fromScVal` reads more
  // deeply — easiest path is to mock `getContractData` to return a pre-formed
  // object that passes Address.fromScVal's expectations.
  return { _arm: "address", _value: { _attributes: { _: { toString: () => addr } } } };
}

function scvBool(b: boolean): any { return { _arm: "b", _value: b }; }
function scvU32(n: number): any { return { _arm: "u32", _value: n }; }
function scvU64(n: bigint): any { return { _arm: "u64", _value: n }; }
function scvI128(hi: bigint, lo: bigint): any {
  return { _arm: "i128", _value: { _attributes: { lo: { _value: lo }, hi: { _value: hi } } } };
}
function scvBytes(buf: Buffer): any { return { _arm: "bytes", _value: buf }; }

// Mock the SDK at the module boundary so we control what `getContractData` returns.
// vi.mock factories are hoisted above top-level consts, so the spy fns must be
// declared inside vi.hoisted() to avoid a TDZ reference at mock time.
const { getContractData, fromScVal } = vi.hoisted(() => ({
  getContractData: vi.fn(),
  fromScVal: vi.fn((v: any) => ({
    toString: () => v?._value?._attributes?._?.toString?.() ?? "",
  })),
}));

vi.mock("@stellar/stellar-sdk/rpc", () => ({
  Durability: { Persistent: "persistent" },
}));
vi.mock("@stellar/stellar-sdk", async () => {
  const actual = await vi.importActual<any>("@stellar/stellar-sdk");
  return {
    ...actual,
    rpc: { Server: class { getContractData = getContractData; } },
    Address: class { static fromScVal = fromScVal; },
    xdr: {
      ScVal: { scvBytes: (b: Buffer) => ({ _arm: "bytes", _value: b }) },
    },
  };
});

import { getLinkInfo } from "./stellar.js";

const HASH = "a".repeat(64);

describe("getLinkInfo", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CONTRACT_ID = "CABC";
    getContractData.mockReset();
    fromScVal.mockClear();
  });

  it("rejects malformed hash before hitting the RPC", async () => {
    await expect(getLinkInfo("not-hex")).rejects.toThrow(/64 hex chars/);
    expect(getContractData).not.toHaveBeenCalled();
  });

  it("returns null on 404 from the RPC", async () => {
    getContractData.mockRejectedValueOnce(Object.assign(new Error("not found"), { status: 404 }));
    expect(await getLinkInfo(HASH)).toBeNull();
  });

  it("decodes a full LinkInfo map entry", async () => {
    const entry = makeMapEntry([
      ["claimed", scvBool(false)],
      ["creator", scvAddress("GABC")],
      ["asset", scvAddress("CASSET")],
      ["amount", scvI128(0n, 100_000_000n)], // 10 XLM
      ["policy_type", scvU32(0)],
      ["policy_params", scvBytes(Buffer.alloc(0))],
      ["expires_at", scvU64(1_700_000_000n)],
    ]);
    getContractData.mockResolvedValueOnce(entry);

    const info = await getLinkInfo(HASH);
    expect(info).toEqual({
      creator: "GABC",
      asset: "CASSET",
      amount: 100_000_000n,
      policyType: 0,
      policyParams: "",
      expiresAt: 1_700_000_000n,
      claimed: false,
    });
  });

  it("returns null when any required field is missing", async () => {
    const entry = makeMapEntry([
      ["claimed", scvBool(true)],
      // creator omitted
      ["amount", scvI128(0n, 1n)],
    ]);
    getContractData.mockResolvedValueOnce(entry);
    expect(await getLinkInfo(HASH)).toBeNull();
  });
});
