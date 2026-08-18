import { afterEach, describe, expect, it } from "vitest";
import {
  fromDomainAligns,
  validateDkimSignatureHeader,
  verifyEmailOwnership,
  resetDkimVerifier,
  setDkimVerifier,
} from "./dkim.js";

const NOW = Date.UTC(2026, 7, 15, 12, 0, 0);
const NOW_SEC = Math.floor(NOW / 1000);
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const B64 = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=";

type Fixture = {
  name: string;
  message: string;
  expectOk: boolean;
  errorMatch?: RegExp;
};

/** Minimal structurally-valid DKIM-signed message for the happy path. */
function validMessage(overrides: {
  sigTags?: string;
  from?: string;
  extraHeaders?: string[];
  body?: string;
}): string {
  const sig =
    overrides.sigTags ??
    `v=1; a=rsa-sha256; d=example.com; s=s1; c=relaxed/relaxed; t=${NOW_SEC - 60}; h=from:subject; bh=${B64}; b=${B64}`;
  const headers = [
    `DKIM-Signature: ${sig}`,
    `From: ${overrides.from ?? "Alice <alice@example.com>"}`,
    "Message-ID: <m-1@example.com>",
    ...(overrides.extraHeaders ?? []),
  ];
  return `${headers.join("\r\n")}\r\nSubject: hello\r\n\r\n${overrides.body ?? "hello world"}`;
}

const FIXTURES: Fixture[] = [
  {
    name: "valid signature passes strict validation",
    message: validMessage({}),
    expectOk: true,
  },
  {
    name: "missing DKIM-Signature header",
    message: `From: alice@example.com\r\nMessage-ID: <m-1@example.com>\r\n\r\nhello`,
    expectOk: false,
    errorMatch: /no DKIM-Signature/i,
  },
  {
    name: "unsupported version v=2",
    message: validMessage({
      sigTags: `v=2; a=rsa-sha256; d=example.com; s=s1; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /version/i,
  },
  {
    name: "weak algorithm rsa-sha1 rejected",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha1; d=example.com; s=s1; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /algorithm/i,
  },
  {
    name: "h= does not cover From",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; h=subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /h= must cover/i,
  },
  {
    name: "broken base64 in b= (tampered signature)",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; h=from:subject; bh=${B64}; b=!!!not-base64!!!`,
    }),
    expectOk: false,
    errorMatch: /b= .*base64/i,
  },
  {
    name: "expired signature (x= in the past)",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; t=${NOW_SEC - 7200}; x=${NOW_SEC - 3600}; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /expired/i,
  },
  {
    name: "future-dated t= beyond clock skew",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; t=${NOW_SEC + 3600}; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /future/i,
  },
  {
    name: "stale signature beyond replay window",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; t=${Math.floor((NOW - MAX_AGE_MS - 3600_000) / 1000)}; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /stale|replay window/i,
  },
  {
    name: "x= predates t=",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; t=${NOW_SEC - 60}; x=${NOW_SEC - 3600}; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /predates/i,
  },
  {
    name: "l= truncation allows appended unsigned content",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; h=from:subject; l=1; bh=${B64}; b=${B64}`,
      body: "hello world, this body is much longer than one byte",
    }),
    expectOk: false,
    errorMatch: /l=|truncat/i,
  },
  {
    name: "invalid canonicalization c=",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; s=s1; c=fancy/relaxed; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /canonicalization/i,
  },
  {
    name: "missing Message-ID",
    message: (() => {
      const m = validMessage({});
      return m.replace(/^Message-ID:.*\r\n/im, "");
    })(),
    expectOk: false,
    errorMatch: /Message-ID/i,
  },
  {
    name: "duplicate Message-ID",
    message: validMessage({
      extraHeaders: ["Message-ID: <m-2@example.com>"],
    }),
    expectOk: false,
    errorMatch: /duplicate Message-ID/i,
  },
  {
    name: "missing d= tag",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; s=s1; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /d=|signing domain/i,
  },
  {
    name: "missing selector s=",
    message: validMessage({
      sigTags: `v=1; a=rsa-sha256; d=example.com; h=from:subject; bh=${B64}; b=${B64}`,
    }),
    expectOk: false,
    errorMatch: /s=|selector/i,
  },
];

describe("DKIM strict validation fixtures (RFC 6376 + attack vectors)", () => {
  it.each(FIXTURES)("$name", ({ message, expectOk, errorMatch }) => {
    const result = validateDkimSignatureHeader(message, { now: NOW, maxAgeMs: MAX_AGE_MS });
    expect(result.ok).toBe(expectOk);
    if (!expectOk && !result.ok) {
      expect(result.error).toMatch(errorMatch!);
    }
  });

  it("accepts subdomain From aligned with organizational d=", () => {
    const message = validMessage({ from: "alice@mail.example.com" });
    const result = validateDkimSignatureHeader(message, { now: NOW, maxAgeMs: MAX_AGE_MS });
    expect(result.ok).toBe(true);
  });

  it("fromDomainAligns rejects cross-domain spoof", () => {
    expect(fromDomainAligns("alice@example.com", "evil.com")).toBe(false);
    expect(fromDomainAligns("alice@example.com", "example.com")).toBe(true);
    expect(fromDomainAligns("alice@mail.example.com", "example.com")).toBe(true);
    // Similar-suffix tricks must not pass.
    expect(fromDomainAligns("alice@notexample.com", "example.com")).toBe(false);
  });
});

describe("ownership check alignment (cross-domain spoof)", () => {
  afterEach(() => {
    resetDkimVerifier();
  });

  it("rejects a passing DKIM signature from a domain that does not cover the From address", async () => {
    // Attacker DKIM-signs with evil.com but spoofs From: alice@example.com.
    setDkimVerifier(async () => ({
      ok: true,
      fromAddress: "alice@example.com",
      signingDomain: "evil.com",
    }));
    const challenge = "deadbeefcafebabe";
    const result = await verifyEmailOwnership({
      claimedEmail: "alice@example.com",
      challenge,
      rawMessage: `From: alice@example.com\r\n\r\n${challenge}`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/align/i);
  });

  it("accepts aligned signing domain", async () => {
    setDkimVerifier(async () => ({
      ok: true,
      fromAddress: "alice@example.com",
      signingDomain: "example.com",
    }));
    const challenge = "deadbeefcafebabe";
    const result = await verifyEmailOwnership({
      claimedEmail: "alice@example.com",
      challenge,
      rawMessage: `From: alice@example.com\r\n\r\n${challenge}`,
    });
    expect(result.ok).toBe(true);
  });
});
