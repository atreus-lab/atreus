import { AtreusIndexer } from './indexer.js';

export type EventType = "view" | "initiation" | "claim" | "created" | "refunded" | "attested";

export interface AnalyticsEvent {
  id: string;
  linkHash: string;
  eventType: EventType;
  sessionId: string;
  timestamp: number;
}

export interface LinkStats {
  linkHash: string;
  views: number;
  uniqueViews: number;
  initiations: number;
  claims: number;
  claimRate: number;
  avgTimeToClaimMs: number | null;
}

export interface SummaryStats {
  totalViews: number;
  uniqueViews: number;
  initiations: number;
  claims: number;
  claimRate: number;
  avgTimeToClaimMs: number | null;
  perLink: Record<string, LinkStats>;
  // New indexed metrics
  activeLinkCount: number;
  totalFees: number;
  blockedNullifiers: number;
  emailRestrictedClaims: number;
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  initiations: number;
  claims: number;
}

export interface IngestEvent {
  linkHash: string;
  eventType: EventType;
  sessionId: string;
  timestamp?: number;
}

// Singleton indexer for the backend API
export const analyticsDb = new AtreusIndexer();

export function ingestEvent(input: IngestEvent): { id: string; linkHash: string; eventType: EventType; sessionId: string; timestamp: number } {
  const id = analyticsDb.ingestOffChainEvent(input.linkHash, input.eventType, input.sessionId, input.timestamp);
  return {
    id,
    linkHash: input.linkHash,
    eventType: input.eventType,
    sessionId: input.sessionId,
    timestamp: input.timestamp ?? Date.now(),
  };
}

export function getLinkStats(linkHash: string): LinkStats {
  const hash = linkHash.toLowerCase();
  const events = analyticsDb.getEvents({ linkHash: hash });

  const views = events.filter(e => e.event_type === "view").length;
  const uniqueSessions = new Set(
    events
      .filter(e => e.event_type === "view")
      .map(e => {
        try { return JSON.parse(e.data).sessionId; } catch { return null; }
      })
      .filter(Boolean)
  );
  const uniqueViews = uniqueSessions.size;
  const initiations = events.filter(e => e.event_type === "initiation").length;
  const claims = events.filter(e => e.event_type === "claim" || e.event_type === "claimed").length;
  const claimRate = views > 0 ? Math.round((claims / views) * 10000) / 100 : 0;

  const viewEvents = events.filter(e => e.event_type === "view");
  const claimEvents = events.filter(e => e.event_type === "claim" || e.event_type === "claimed");

  let totalTimeToClaim = 0;
  let matchedClaims = 0;

  for (const claim of claimEvents) {
    const claimSessionId = claim.data ? JSON.parse(claim.data).sessionId : null;
    if (!claimSessionId) continue;

    const sessionViews = viewEvents.filter(v => {
      const vSessionId = v.data ? JSON.parse(v.data).sessionId : null;
      return vSessionId === claimSessionId;
    });

    if (sessionViews.length > 0) {
      const firstView = Math.min(...sessionViews.map(v => v.timestamp));
      totalTimeToClaim += claim.timestamp - firstView;
      matchedClaims++;
    }
  }

  const avgTimeToClaimMs = matchedClaims > 0 ? Math.round(totalTimeToClaim / matchedClaims) : null;

  return { linkHash, views, uniqueViews, initiations, claims, claimRate, avgTimeToClaimMs };
}

export function getSummaryStats(): SummaryStats {
  const allEvents = analyticsDb.getEvents({});
  const viewEvents = allEvents.filter(e => e.event_type === "view");
  const uniqueSessions = new Set(
    viewEvents
      .map(e => {
        try { return JSON.parse(e.data).sessionId; } catch { return null; }
      })
      .filter(Boolean)
  );

  const totalViews = viewEvents.length;
  const uniqueViews = uniqueSessions.size;
  const initiations = allEvents.filter(e => e.event_type === "initiation").length;
  const claims = allEvents.filter(e => e.event_type === "claim" || e.event_type === "claimed").length;
  const claimRate = totalViews > 0 ? Math.round((claims / totalViews) * 10000) / 100 : 0;

  const claimEvents = allEvents.filter(e => e.event_type === "claim" || e.event_type === "claimed");
  let totalTimeToClaim = 0;
  let matchedClaims = 0;

  for (const claim of claimEvents) {
    const claimSessionId = claim.data ? JSON.parse(claim.data).sessionId : null;
    if (!claimSessionId) continue;

    const sessionViews = viewEvents.filter(v => {
      const vSessionId = v.data ? JSON.parse(v.data).sessionId : null;
      return vSessionId === claimSessionId;
    });

    if (sessionViews.length > 0) {
      const firstView = Math.min(...sessionViews.map(v => v.timestamp));
      totalTimeToClaim += claim.timestamp - firstView;
      matchedClaims++;
    }
  }

  const avgTimeToClaimMs = matchedClaims > 0 ? Math.round(totalTimeToClaim / matchedClaims) : null;

  const perLink: Record<string, LinkStats> = {};
  const uniqueHashes = new Set(allEvents.map(e => e.link_hash));

  for (const hash of uniqueHashes) {
    perLink[hash] = getLinkStats(hash);
  }

  // Indexed metrics
  const activeLinkCount = uniqueHashes.size;
  const blockedNullifiers = allEvents.filter(e => e.event_type === 'attested').length; // Simplified for now
  const emailRestrictedClaims = allEvents.filter(e => e.data && e.data.includes('email_hash')).length;
  const totalFees = 0; // Would require parsing the actual fee from the tx data

  return {
    totalViews,
    uniqueViews,
    initiations,
    claims,
    claimRate,
    avgTimeToClaimMs,
    perLink,
    activeLinkCount,
    totalFees,
    blockedNullifiers,
    emailRestrictedClaims
  };
}

export function getTimeSeries(linkHash: string, days: 7 | 30 | 90): TimeSeriesPoint[] {
  const hash = linkHash.toLowerCase();
  const events = analyticsDb.getEvents({ linkHash: hash });
  if (events.length === 0) return [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const points = new Map<string, { views: number; initiations: number; claims: number }>();

  for (const evt of events) {
    if (evt.timestamp < cutoff.getTime()) continue;
    const dateKey = new Date(evt.timestamp).toISOString().slice(0, 10);
    const existing = points.get(dateKey) ?? { views: 0, initiations: 0, claims: 0 };
    if (evt.event_type === "view") existing.views++;
    else if (evt.event_type === "initiation") existing.initiations++;
    else if (evt.event_type === "claim" || evt.event_type === "claimed") existing.claims++;
    points.set(dateKey, existing);
  }

  const result: TimeSeriesPoint[] = [];
  const cursor = new Date(cutoff);
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 10);
    const p = points.get(key) ?? { views: 0, initiations: 0, claims: 0 };
    result.push({ date: key, ...p });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function getGlobalTimeSeries(days: 7 | 30 | 90): TimeSeriesPoint[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const points = new Map<string, { views: number; initiations: number; claims: number }>();
  const events = analyticsDb.getEvents({});

  for (const evt of events) {
    if (evt.timestamp < cutoff.getTime()) continue;
    const dateKey = new Date(evt.timestamp).toISOString().slice(0, 10);
    const existing = points.get(dateKey) ?? { views: 0, initiations: 0, claims: 0 };
    if (evt.event_type === "view") existing.views++;
    else if (evt.event_type === "initiation") existing.initiations++;
    else if (evt.event_type === "claim" || evt.event_type === "claimed") existing.claims++;
    points.set(dateKey, existing);
  }

  const result: TimeSeriesPoint[] = [];
  const cursor = new Date(cutoff);
  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 10);
    const p = points.get(key) ?? { views: 0, initiations: 0, claims: 0 };
    result.push({ date: key, ...p });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function getAllLinkHashes(): string[] {
  const events = analyticsDb.getEvents({});
  return Array.from(new Set(events.map(e => e.link_hash)));
}

export function resetAnalytics(): void {
  analyticsDb.reset();
}
