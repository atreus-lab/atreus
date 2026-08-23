import { describe, expect, it } from "vitest";
import { isDisposableEmail } from "./disposableDomains.js";

describe("disposable email domains", () => {
  it("blocks known disposable providers", () => {
    expect(isDisposableEmail("a@mailinator.com")).toBe(true);
    expect(isDisposableEmail("b@10minutemail.com")).toBe(true);
    expect(isDisposableEmail("c@YOPMAIL.com")).toBe(true);
  });

  it("blocks subdomains of disposable providers", () => {
    expect(isDisposableEmail("a@x.mailinator.com")).toBe(true);
  });

  it("allows regular providers", () => {
    expect(isDisposableEmail("alice@example.com")).toBe(false);
    expect(isDisposableEmail("bob@gmail.com")).toBe(false);
  });

  it("does not block lookalike suffix domains", () => {
    expect(isDisposableEmail("a@notmailinator.com")).toBe(false);
  });

  it("supports extra domains via parameter", () => {
    expect(isDisposableEmail("a@burner.example")).toBe(false);
    expect(isDisposableEmail("a@burner.example", ["burner.example"])).toBe(true);
  });

  it("handles invalid input without throwing", () => {
    expect(isDisposableEmail("not-an-email")).toBe(false);
    expect(isDisposableEmail("")).toBe(false);
  });
});
