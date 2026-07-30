import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  extractFromAddress,
  messageContainsChallenge,
  resetDkimVerifier,
  setDkimVerifier,
  verifyEmailOwnership,
} from "./dkim.js";

describe("dkim helpers", () => {
  beforeEach(() => {
    setDkimVerifier(async () => ({ ok: true, fromAddress: "alice@example.com" }));
  });
  afterEach(() => {
    resetDkimVerifier();
  });

  it("extracts From with display name", () => {
    const raw = "From: Alice <Alice@Example.com>\r\nSubject: hi\r\n\r\nbody";
    expect(extractFromAddress(raw)).toBe("alice@example.com");
  });

  it("extracts bare From", () => {
    const raw = "From: bob@example.org\r\n\r\nbody";
    expect(extractFromAddress(raw)).toBe("bob@example.org");
  });

  it("detects challenge in body", () => {
    expect(messageContainsChallenge("hello token-abc body", "token-abc")).toBe(true);
    expect(messageContainsChallenge("nope", "token-abc")).toBe(false);
  });

  it("accepts ownership when dkim from and challenge match", async () => {
    const challenge = "deadbeefcafebabe";
    const raw = [
      "From: Alice <alice@example.com>",
      "DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=s1;",
      "Subject: verify " + challenge,
      "",
      "challenge " + challenge,
    ].join("\r\n");

    const result = await verifyEmailOwnership({
      claimedEmail: "alice@example.com",
      challenge,
      rawMessage: raw,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing challenge", async () => {
    const result = await verifyEmailOwnership({
      claimedEmail: "alice@example.com",
      challenge: "deadbeefcafebabe",
      rawMessage: "From: alice@example.com\r\n\r\nno token",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/challenge/i);
  });

  it("rejects from mismatch", async () => {
    setDkimVerifier(async () => ({ ok: true, fromAddress: "eve@evil.com" }));
    const challenge = "deadbeefcafebabe";
    const raw = `From: eve@evil.com\r\n\r\n${challenge}`;
    const result = await verifyEmailOwnership({
      claimedEmail: "alice@example.com",
      challenge,
      rawMessage: raw,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/does not match/i);
  });

  it("rejects failed dkim", async () => {
    setDkimVerifier(async () => ({ ok: false, error: "bad signature" }));
    const challenge = "deadbeefcafebabe";
    const result = await verifyEmailOwnership({
      claimedEmail: "alice@example.com",
      challenge,
      rawMessage: `From: alice@example.com\r\n\r\n${challenge}`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/bad signature/);
  });
});
