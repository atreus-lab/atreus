import { describe, expect, it, vi } from "vitest";

const LINK_HASH_A = "a".repeat(64);
const LINK_HASH_B = "b".repeat(64);
const SESSION_1 = "session-11111111";
const SESSION_2 = "session-22222222";

function makeTimestamp(offsetMs: number): number {
  return Date.now() - offsetMs;
}

describe("analytics storage", () => {
  it("records a view event and returns correct shape", async () => {
    vi.resetModules();
    const { ingestEvent, getLinkStats } = await import("./analytics.js");
    const evt = ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    expect(evt).toMatchObject({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1 });
    expect(evt.id).toBeTruthy();
    const stats = getLinkStats(LINK_HASH_A);
    expect(stats.views).toBe(1);
    expect(stats.uniqueViews).toBe(1);
    expect(stats.claims).toBe(0);
  });

  it("computes unique views per session", async () => {
    vi.resetModules();
    const { ingestEvent, getLinkStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(1000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(2000) });
    const stats = getLinkStats(LINK_HASH_A);
    expect(stats.views).toBe(3);
    expect(stats.uniqueViews).toBe(2);
  });

  it("tracks initiations and claims with correct counts", async () => {
    vi.resetModules();
    const { ingestEvent, getLinkStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "initiation", sessionId: SESSION_1, timestamp: makeTimestamp(1000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "claim", sessionId: SESSION_1, timestamp: makeTimestamp(5000) });
    const stats = getLinkStats(LINK_HASH_A);
    expect(stats.views).toBe(1);
    expect(stats.uniqueViews).toBe(1);
    expect(stats.initiations).toBe(1);
    expect(stats.claims).toBe(1);
    expect(stats.claimRate).toBe(100);
  });

  it("computes claim rate correctly", async () => {
    vi.resetModules();
    const { ingestEvent, getLinkStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(1000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "claim", sessionId: SESSION_1, timestamp: makeTimestamp(2000) });
    const stats = getLinkStats(LINK_HASH_A);
    expect(stats.claimRate).toBe(50);
  });

  it("returns empty stats for unknown link", async () => {
    vi.resetModules();
    const { getLinkStats } = await import("./analytics.js");
    const stats = getLinkStats("unknown");
    expect(stats).toMatchObject({ linkHash: "unknown", views: 0, uniqueViews: 0, claims: 0, claimRate: 0, avgTimeToClaimMs: null });
  });

  it("computes average time-to-claim from first view to claim in same session", async () => {
    vi.resetModules();
    const { ingestEvent, getLinkStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(10000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(9000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "claim", sessionId: SESSION_1, timestamp: makeTimestamp(5000) });
    const stats = getLinkStats(LINK_HASH_A);
    expect(stats.avgTimeToClaimMs).toBe(5000);
  });

  it("returns null avg time-to-claim when no claims", async () => {
    vi.resetModules();
    const { ingestEvent, getLinkStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "initiation", sessionId: SESSION_1, timestamp: makeTimestamp(1000) });
    const stats = getLinkStats(LINK_HASH_A);
    expect(stats.avgTimeToClaimMs).toBeNull();
  });

  it("computes summary stats across multiple links", async () => {
    vi.resetModules();
    const { ingestEvent, getSummaryStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "claim", sessionId: SESSION_1, timestamp: makeTimestamp(5000) });
    ingestEvent({ linkHash: LINK_HASH_B, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_B, eventType: "initiation", sessionId: SESSION_2, timestamp: makeTimestamp(1000) });
    const summary = getSummaryStats();
    expect(summary.totalViews).toBe(2);
    expect(summary.uniqueViews).toBe(2);
    expect(summary.initiations).toBe(1);
    expect(summary.claims).toBe(1);
    expect(summary.claimRate).toBe(50);
    expect(Object.keys(summary.perLink).length).toBe(2);
  });

  it("produces time series with daily buckets", async () => {
    vi.resetModules();
    const { ingestEvent, getTimeSeries } = await import("./analytics.js");
    const day0 = makeTimestamp(0);
    const day1 = makeTimestamp(24 * 60 * 60 * 1000);
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: day0 });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: day1 });
    const series = getTimeSeries(LINK_HASH_A, 7);
    expect(series.length).toBeGreaterThanOrEqual(2);
    const day0Entry = series.find(p => p.date === new Date(day0).toISOString().slice(0, 10));
    expect(day0Entry?.views).toBe(1);
  });

  it("returns empty array for time series on unknown link", async () => {
    vi.resetModules();
    const { getTimeSeries } = await import("./analytics.js");
    expect(getTimeSeries("unknown", 7)).toEqual([]);
  });

  it("lists all link hashes", async () => {
    vi.resetModules();
    const { ingestEvent, getAllLinkHashes } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_B, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(0) });
    const hashes = getAllLinkHashes();
    expect(hashes).toContain(LINK_HASH_A);
    expect(hashes).toContain(LINK_HASH_B);
    expect(hashes.length).toBe(2);
  });
});
