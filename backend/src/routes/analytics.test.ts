import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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

afterAll(() => server ? new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) : undefined);

beforeEach(async () => {
  const { resetAnalytics } = await import("../lib/analytics.js");
  resetAnalytics();
});

describe("analytics routes", () => {
  it("rejects invalid event payloads", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("records a view event and returns 201", async () => {
    const linkHash = "a".repeat(64);
    const res = await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-correlation-id": "corr-1" },
      body: JSON.stringify({ linkHash, eventType: "view", sessionId: "sess-abc-1234" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { status: string; correlationId: string; id: string };
    expect(body).toMatchObject({ status: "recorded", correlationId: "corr-1" });
    expect(body.id).toBeTruthy();
  });

  it("rejects invalid linkHash length", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkHash: "short", eventType: "view", sessionId: "sess-1234" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid eventType", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkHash: "a".repeat(64), eventType: "invalid", sessionId: "sess-1234" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns link stats after recording events", async () => {
    const hash = "b".repeat(64);
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkHash: hash, eventType: "view", sessionId: "session-1111" }),
    });
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkHash: hash, eventType: "view", sessionId: "session-2222" }),
    });
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkHash: hash, eventType: "claim", sessionId: "session-1111" }),
    });
    const res = await fetch(`${baseUrl}/api/analytics/links/${encodeURIComponent(hash)}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { stats: { views: number; uniqueViews: number; claims: number; claimRate: number }; timeSeries: unknown[] };
    expect(body.stats).toMatchObject({ views: 2, uniqueViews: 2, claims: 1, claimRate: 50 });
    expect(body.timeSeries).toBeInstanceOf(Array);
  });

  it("returns 200 for unknown link stats with zeroed fields", async () => {
    const res = await fetch(`${baseUrl}/api/analytics/links/unknown`);
    expect(res.status).toBe(200);
    const body = await res.json() as { stats: { views: number; claims: number; claimRate: number } };
    expect(body.stats).toMatchObject({ views: 0, claims: 0, claimRate: 0 });
  });

  it("returns summary stats", async () => {
    const hash = "c".repeat(64);
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkHash: hash, eventType: "view", sessionId: "session-3333" }),
    });
    await fetch(`${baseUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkHash: hash, eventType: "initiation", sessionId: "session-3333" }),
    });
    const res = await fetch(`${baseUrl}/api/analytics/summary`);
    expect(res.status).toBe(200);
    const body = await res.json() as { stats: { totalViews: number; initiations: number }; timeSeries: { "7d": unknown[]; "30d": unknown[]; "90d": unknown[] }; links: string[] };
    expect(body.stats.totalViews).toBeGreaterThanOrEqual(1);
    expect(body.stats.initiations).toBeGreaterThanOrEqual(1);
    expect(body.timeSeries).toHaveProperty("7d");
    expect(body.timeSeries).toHaveProperty("30d");
    expect(body.timeSeries).toHaveProperty("90d");
    expect(body.links).toContain(hash);
  });
});
