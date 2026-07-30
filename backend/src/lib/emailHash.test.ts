import { describe, expect, it } from "vitest";
import { hashEmail, isEmailHashHex, isValidEmail, normalizeEmail } from "./emailHash.js";

describe("emailHash", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
  });

  it("hashes consistently", () => {
    const a = hashEmail("alice@example.com");
    const b = hashEmail("  ALICE@example.com ");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("validates email shapes", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("validates hash hex", () => {
    expect(isEmailHashHex("a".repeat(64))).toBe(true);
    expect(isEmailHashHex("A".repeat(64))).toBe(false);
    expect(isEmailHashHex("ab")).toBe(false);
  });
});
