import { describe, expect, it, vi, beforeEach } from "vitest";

const LINK_HASH_A = "a".repeat(64);
const LINK_HASH_B = "b".repeat(64);
const SESSION_1 = "session-11111111";
const SESSION_2 = "session-22222222";

function makeTimestamp(offsetMs: number): number {
  return Date.now() - offsetMs;
}

describe("analytics storage", () => {
  beforeEach(async () => {
    const { resetAnalytics } = await import("./analytics.js");
    resetAnalytics();
  });

  it("records a view event and returns correct shape", async () => {
    vi.resetModules();
    const { ingestEvent, getSummaryStats } = await import("./analytics.js");
    const evt = ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    expect(evt).toMatchObject({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1 });
    expect(evt.id).toBeTruthy();
    const stats = getSummaryStats();
    expect(stats.totalViews).toBe(1);
    expect(stats.uniqueViews).toBe(1);
    expect(stats.claims).toBe(0);
  });

  it("computes unique views per session", async () => {
    vi.resetModules();
    const { ingestEvent, getSummaryStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(1000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(2000) });
    const stats = getSummaryStats();
    expect(stats.totalViews).toBe(3);
    expect(stats.uniqueViews).toBe(2);
  });

  it("tracks initiations and claims with correct counts", async () => {
    vi.resetModules();
    const { ingestEvent, getSummaryStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "initiation", sessionId: SESSION_1, timestamp: makeTimestamp(1000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "claim", sessionId: SESSION_1, timestamp: makeTimestamp(5000) });
    const stats = getSummaryStats();
    expect(stats.totalViews).toBe(1);
    expect(stats.uniqueViews).toBe(1);
    expect(stats.initiations).toBe(1);
    expect(stats.claims).toBe(1);
    expect(stats.claimRate).toBe(100);
  });

  it("computes claim rate correctly", async () => {
    vi.resetModules();
    const { ingestEvent, getSummaryStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(1000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "claim", sessionId: SESSION_1, timestamp: makeTimestamp(2000) });
    expect(getSummaryStats().claimRate).toBe(50);
  });

  it("returns zeroed stats when nothing was ingested", async () => {
    vi.resetModules();
    const { getSummaryStats } = await import("./analytics.js");
    expect(getSummaryStats()).toEqual({
      totalViews: 0, uniqueViews: 0, initiations: 0, claims: 0, claimRate: 0, avgTimeToClaimMs: null,
      activeLinkCount: 0, totalFees: 0, blockedNullifiers: 0, emailRestrictedClaims: 0,
    });
  });

  it("computes average time-to-claim from first view to claim in same session", async () => {
    vi.resetModules();
    const { ingestEvent, getSummaryStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(10000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_2, timestamp: makeTimestamp(9000) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "claim", sessionId: SESSION_1, timestamp: makeTimestamp(5000) });
    const stats = getSummaryStats();
    expect(stats.avgTimeToClaimMs).toBeGreaterThanOrEqual(4990);
    expect(stats.avgTimeToClaimMs).toBeLessThanOrEqual(5010);
  });

  it("returns null avg time-to-claim when no claims", async () => {
    vi.resetModules();
    const { ingestEvent, getSummaryStats } = await import("./analytics.js");
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: makeTimestamp(0) });
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "initiation", sessionId: SESSION_1, timestamp: makeTimestamp(1000) });
    expect(getSummaryStats().avgTimeToClaimMs).toBeNull();
  });

  it("aggregates summary stats across multiple links", async () => {
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
    expect(summary).not.toHaveProperty("perLink");
  });

  it("produces a global time series with daily buckets", async () => {
    vi.resetModules();
    const { ingestEvent, getGlobalTimeSeries } = await import("./analytics.js");
    const day0 = makeTimestamp(0);
    const day1 = makeTimestamp(24 * 60 * 60 * 1000);
    ingestEvent({ linkHash: LINK_HASH_A, eventType: "view", sessionId: SESSION_1, timestamp: day0 });
    ingestEvent({ linkHash: LINK_HASH_B, eventType: "view", sessionId: SESSION_1, timestamp: day1 });
    const series = getGlobalTimeSeries(7);
    expect(series.length).toBeGreaterThanOrEqual(2);
    const day0Entry = series.find(p => p.date === new Date(day0).toISOString().slice(0, 10));
    expect(day0Entry?.views).toBe(1);
  });

  it("returns a zeroed global time series when nothing was ingested", async () => {
    vi.resetModules();
    const { getGlobalTimeSeries } = await import("./analytics.js");
    const series = getGlobalTimeSeries(7);
    expect(series.length).toBeGreaterThanOrEqual(7);
    expect(series.every(p => p.views === 0 && p.initiations === 0 && p.claims === 0)).toBe(true);
  });

  it("exposes no per-link accessors (aggregate-only)", async () => {
    vi.resetModules();
    const mod = await import("./analytics.js") as Record<string, unknown>;
    expect(mod.getLinkStats).toBeUndefined();
    expect(mod.getTimeSeries).toBeUndefined();
    expect(mod.getAllLinkHashes).toBeUndefined();
  });
});
