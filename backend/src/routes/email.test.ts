import type { Server } from "http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashEmail } from "../lib/emailHash.js";
import { resetEmailVerificationStore, isEmailHashVerified, markVerified } from "../lib/emailVerificationStore.js";
import { resetDkimVerifier, setDkimVerifier } from "../lib/dkim.js";
import { emailEndpointLimiter } from "../lib/rateLimit.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.VERCEL = "1";
  process.env.FRONTEND_URL = "https://frontend.example";
  const { default: app } = await import("../index.js");
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No test port");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
}, 30000);

afterAll(() =>
  server
    ? new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    : undefined,
);

beforeEach(() => {
  resetEmailVerificationStore();
  emailEndpointLimiter.reset();
  setDkimVerifier(async () => ({ ok: true, fromAddress: "alice@example.com" }));
});

afterEach(() => {
  resetDkimVerifier();
});

describe("email verification routes", () => {
  it("rejects invalid email on verify", async () => {
    const res = await fetch(`${baseUrl}/api/email/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-valid" }),
    });
    expect(res.status).toBe(400);
  });

  it("issues a challenge keyed only by email hash", async () => {
    const res = await fetch(`${baseUrl}/api/email/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": "test-1" },
      body: JSON.stringify({ email: "alice@example.com" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      emailHash: string;
      challenge: string;
      correlationId: string;
    };
    expect(body.emailHash).toBe(hashEmail("alice@example.com"));
    expect(body.challenge).toMatch(/^[0-9a-f]{32}$/);
    expect(body.correlationId).toBe("test-1");
    // Store must not be queryable by raw email — only by hash.
    expect(isEmailHashVerified(body.emailHash)).toBe(false);
  });

  it("confirms ownership with mock DKIM and marks hash verified", async () => {
    const verifyRes = await fetch(`${baseUrl}/api/email/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "alice@example.com" }),
    });
    const { challenge, emailHash } = (await verifyRes.json()) as {
      challenge: string;
      emailHash: string;
    };

    const rawMessage = [
      "From: Alice <alice@example.com>",
      "DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=s1;",
      "Subject: Atreus verify",
      "",
      `challenge ${challenge}`,
    ].join("\r\n");

    const confirmRes = await fetch(`${baseUrl}/api/email/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "alice@example.com", rawMessage }),
    });
    expect(confirmRes.status).toBe(200);
    const confirmed = (await confirmRes.json()) as {
      verified: boolean;
      emailHash: string;
    };
    expect(confirmed.verified).toBe(true);
    expect(confirmed.emailHash).toBe(emailHash);
    expect(isEmailHashVerified(emailHash)).toBe(true);

    const statusRes = await fetch(`${baseUrl}/api/email/status?emailHash=${emailHash}`);
    expect(statusRes.status).toBe(200);
    expect(((await statusRes.json()) as { verified: boolean }).verified).toBe(true);
  });

  it("rejects confirm without prior verify", async () => {
    const res = await fetch(`${baseUrl}/api/email/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        rawMessage: "From: alice@example.com\r\n\r\nhello challengedeadbeef",
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/No pending verification/i);
  });

  it("rejects confirm when DKIM fails", async () => {
    setDkimVerifier(async () => ({ ok: false, error: "signature invalid" }));
    const verifyRes = await fetch(`${baseUrl}/api/email/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "alice@example.com" }),
    });
    const { challenge } = (await verifyRes.json()) as { challenge: string };
    const res = await fetch(`${baseUrl}/api/email/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.com",
        rawMessage: `From: alice@example.com\r\n\r\n${challenge}`,
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/signature invalid/);
  });

  it("rate limits verify endpoint", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/email/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `user${i}@example.com` }),
      });
      expect(res.status).toBe(200);
    }
    const blocked = await fetch(`${baseUrl}/api/email/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "extra@example.com" }),
    });
    expect(blocked.status).toBe(429);
  });
});

describe("attest email gate", () => {
  it("rejects email-restricted attest when hash is not DKIM-verified", async () => {
    const emailHash = hashEmail("alice@example.com");
    const linkHash = "ab".repeat(32);
    const res = await fetch(`${baseUrl}/api/links/${linkHash}/attest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        proof: "aa",
        link_hash: "0x" + "11".repeat(32),
        nullifier: "0x" + "22".repeat(32),
        recipient_email_hash: emailHash,
      }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Email ownership not verified/i);
  });

  it("passes email gate when hash is verified (then fails on zk as expected)", async () => {
    const emailHash = hashEmail("alice@example.com");
    markVerified(emailHash);
    const linkHash = "cd".repeat(32);
    const res = await fetch(`${baseUrl}/api/links/${linkHash}/attest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        proof: "aa",
        link_hash: "0x" + "11".repeat(32),
        nullifier: "0x" + "22".repeat(32),
        recipient_email_hash: emailHash,
      }),
    });
    // Gate passed: either zk fails (400) or circuit missing (500) — not 403.
    expect(res.status).not.toBe(403);
  });
});
