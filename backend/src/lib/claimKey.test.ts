import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { computeClaimKey, computeEmailKey, SALT_BYTES } from "./claimKey.js";

// Frozen fixture — the contract derives the same keys, so these bytes are an interface.
const LINK_HASH = Buffer.alloc(32, 0x11);
const RECIPIENT = "G" + "A".repeat(55);
const SALT = Buffer.alloc(32, 0x22);
const EMAIL_HASH = Buffer.alloc(32, 0x33);

/** Independent restatement of the spec concatenation, built straight from node:crypto. */
function sha256(...parts: Buffer[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex");
}

describe("computeClaimKey", () => {
  it("matches sha256(tag || link_hash || recipient_ascii || salt)", () => {
    const expected = sha256(
      Buffer.from("ATREUS_CLAIM_V1", "ascii"),
      LINK_HASH,
      Buffer.from(RECIPIENT, "ascii"),
      SALT,
    );
    expect(computeClaimKey(LINK_HASH, RECIPIENT, SALT).toString("hex")).toBe(expected);
  });

  it("pins the fixture vector", () => {
    expect(computeClaimKey(LINK_HASH, RECIPIENT, SALT).toString("hex")).toBe(
      "d3b254d76898ad1a487244dc41096f6c2ba2fe628b41ab77163207af1d1eb2cf",
    );
  });

  it("returns 32 bytes and uses a 15-byte ASCII tag", () => {
    expect(computeClaimKey(LINK_HASH, RECIPIENT, SALT)).toHaveLength(32);
    expect(Buffer.from("ATREUS_CLAIM_V1", "ascii")).toHaveLength(15);
    expect(Buffer.from("ATREUS_EMAIL_V1", "ascii")).toHaveLength(15);
    expect(SALT_BYTES).toBe(32);
  });

  it("blinds the key: a different salt gives a different key", () => {
    const other = computeClaimKey(LINK_HASH, RECIPIENT, Buffer.alloc(32, 0x23));
    expect(other.toString("hex")).not.toBe(computeClaimKey(LINK_HASH, RECIPIENT, SALT).toString("hex"));
  });

  it("rejects a recipient that is not a 56-char strkey", () => {
    expect(() => computeClaimKey(LINK_HASH, "GSHORT", SALT)).toThrow(/56-char Stellar strkey/);
    expect(() => computeClaimKey(LINK_HASH, "G" + "A".repeat(56), SALT)).toThrow(/56-char Stellar strkey/);
  });

  it("rejects a link hash or salt of the wrong length", () => {
    expect(() => computeClaimKey(Buffer.alloc(31, 0x11), RECIPIENT, SALT)).toThrow(/linkHash must be 32 bytes/);
    expect(() => computeClaimKey(LINK_HASH, RECIPIENT, Buffer.alloc(16, 0x22))).toThrow(/salt must be 32 bytes/);
  });
});

describe("computeEmailKey", () => {
  it("matches sha256(tag || link_hash || recipient_ascii || email_hash || salt)", () => {
    const expected = sha256(
      Buffer.from("ATREUS_EMAIL_V1", "ascii"),
      LINK_HASH,
      Buffer.from(RECIPIENT, "ascii"),
      EMAIL_HASH,
      SALT,
    );
    expect(computeEmailKey(LINK_HASH, RECIPIENT, EMAIL_HASH, SALT).toString("hex")).toBe(expected);
  });

  it("pins the fixture vector", () => {
    expect(computeEmailKey(LINK_HASH, RECIPIENT, EMAIL_HASH, SALT).toString("hex")).toBe(
      "400537eedb183b6cbf1ae7c5089418c7f80a37c43c020b2af74614b9348c8bf9",
    );
  });

  it("is domain-separated from the claim key", () => {
    expect(computeEmailKey(LINK_HASH, RECIPIENT, EMAIL_HASH, SALT).toString("hex")).not.toBe(
      computeClaimKey(LINK_HASH, RECIPIENT, SALT).toString("hex"),
    );
  });

  it("rejects an email hash of the wrong length", () => {
    expect(() => computeEmailKey(LINK_HASH, RECIPIENT, Buffer.alloc(20, 0x33), SALT)).toThrow(
      /emailHash must be 32 bytes/,
    );
  });
});
