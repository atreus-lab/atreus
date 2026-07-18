export type EventType = "view" | "initiation" | "claim";

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

interface RawEvent {
  id: string;
  linkHash: string;
  eventType: EventType;
  sessionId: string;
  timestamp: number;
}

const EVENTS = new Map<string, RawEvent>();
const LINK_INDEX = new Map<string, Set<string>>();
const SESSION_INDEX = new Map<string, Set<string>>();

let eventCounter = 0;
let lastPurge = Date.now();

function nextId(): string {
  eventCounter++;
  return `evt_${Date.now()}_${eventCounter}`;
}

function getEventAge(timestamp: number): number {
  return Date.now() - timestamp;
}

function purgeExpired(): void {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const toDelete: string[] = [];
  for (const [id, evt] of EVENTS) {
    if (evt.timestamp < cutoff) {
      toDelete.push(id);
    }
  }
  for (const id of toDelete) {
    const evt = EVENTS.get(id);
    if (evt) {
      const linkSet = LINK_INDEX.get(evt.linkHash);
      if (linkSet) {
        linkSet.delete(id);
        if (linkSet.size === 0) LINK_INDEX.delete(evt.linkHash);
      }
      const sessionSet = SESSION_INDEX.get(evt.sessionId);
      if (sessionSet) {
        sessionSet.delete(id);
        if (sessionSet.size === 0) SESSION_INDEX.delete(evt.sessionId);
      }
      EVENTS.delete(id);
    }
  }
  lastPurge = Date.now();
}

export function resetAnalytics(): void {
  EVENTS.clear();
  LINK_INDEX.clear();
  SESSION_INDEX.clear();
  eventCounter = 0;
  lastPurge = Date.now();
}

export function ingestEvent(input: IngestEvent): AnalyticsEvent {
  if (!lastPurge || Date.now() - lastPurge > 60_000) {
    purgeExpired();
  }
  const event: RawEvent = {
    id: nextId(),
    linkHash: input.linkHash.toLowerCase(),
    eventType: input.eventType,
    sessionId: input.sessionId,
    timestamp: input.timestamp ?? Date.now(),
  };
  EVENTS.set(event.id, event);
  const linkSet = LINK_INDEX.get(event.linkHash) ?? new Set<string>();
  linkSet.add(event.id);
  LINK_INDEX.set(event.linkHash, linkSet);
  const sessionSet = SESSION_INDEX.get(event.sessionId) ?? new Set<string>();
  sessionSet.add(event.id);
  SESSION_INDEX.set(event.sessionId, sessionSet);
  return toAnalyticsEvent(event);
}

export function getLinkStats(linkHash: string): LinkStats {
  const hash = linkHash.toLowerCase();
  const eventIds = LINK_INDEX.get(hash);
  if (!eventIds || eventIds.size === 0) {
    return { linkHash: hash, views: 0, uniqueViews: 0, initiations: 0, claims: 0, claimRate: 0, avgTimeToClaimMs: null };
  }
  const events: RawEvent[] = [];
  for (const id of eventIds) {
    const evt = EVENTS.get(id);
    if (evt) events.push(evt);
  }
  return computeLinkStats(hash, events);
}

export function getSummaryStats(): SummaryStats {
  const events: RawEvent[] = [];
  for (const id of EVENTS) events.push(id[1]);
  return computeSummaryStats(events);
}

export function getTimeSeries(linkHash: string, days: 7 | 30 | 90): TimeSeriesPoint[] {
  const hash = linkHash.toLowerCase();
  const eventIds = LINK_INDEX.get(hash);
  if (!eventIds || eventIds.size === 0) return [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const points = new Map<string, { views: number; initiations: number; claims: number }>();
  for (const id of eventIds) {
    const evt = EVENTS.get(id);
    if (!evt || evt.timestamp < cutoff.getTime()) continue;
    const dateKey = new Date(evt.timestamp).toISOString().slice(0, 10);
    const existing = points.get(dateKey) ?? { views: 0, initiations: 0, claims: 0 };
    if (evt.eventType === "view") existing.views++;
    else if (evt.eventType === "initiation") existing.initiations++;
    else if (evt.eventType === "claim") existing.claims++;
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
  for (const [, evt] of EVENTS) {
    if (evt.timestamp < cutoff.getTime()) continue;
    const dateKey = new Date(evt.timestamp).toISOString().slice(0, 10);
    const existing = points.get(dateKey) ?? { views: 0, initiations: 0, claims: 0 };
    if (evt.eventType === "view") existing.views++;
    else if (evt.eventType === "initiation") existing.initiations++;
    else if (evt.eventType === "claim") existing.claims++;
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
  const hashes = new Set<string>();
  for (const key of LINK_INDEX.keys()) hashes.add(key);
  return Array.from(hashes);
}

function toAnalyticsEvent(raw: RawEvent): AnalyticsEvent {
  return {
    id: raw.id,
    linkHash: raw.linkHash,
    eventType: raw.eventType,
    sessionId: raw.sessionId,
    timestamp: raw.timestamp,
  };
}

function computeLinkStats(linkHash: string, events: RawEvent[]): LinkStats {
  const views = events.filter(e => e.eventType === "view").length;
  const uniqueSessions = new Set(events.filter(e => e.eventType === "view").map(e => e.sessionId));
  const uniqueViews = uniqueSessions.size;
  const initiations = events.filter(e => e.eventType === "initiation").length;
  const claims = events.filter(e => e.eventType === "claim").length;
  const claimRate = views > 0 ? Math.round((claims / views) * 10000) / 100 : 0;
  const viewEvents = events.filter(e => e.eventType === "view");
  const claimEvents = events.filter(e => e.eventType === "claim");
  let totalTimeToClaim = 0;
  let matchedClaims = 0;
  for (const claim of claimEvents) {
    const sessionViews = viewEvents.filter(v => v.sessionId === claim.sessionId);
    if (sessionViews.length > 0) {
      const firstView = sessionViews[0].timestamp;
      totalTimeToClaim += claim.timestamp - firstView;
      matchedClaims++;
    }
  }
  const avgTimeToClaimMs = matchedClaims > 0 ? Math.round(totalTimeToClaim / matchedClaims) : null;
  return { linkHash, views, uniqueViews, initiations, claims, claimRate, avgTimeToClaimMs };
}

function computeSummaryStats(events: RawEvent[]): SummaryStats {
  const viewEvents = events.filter(e => e.eventType === "view");
  const uniqueSessions = new Set(viewEvents.map(e => e.sessionId));
  const totalViews = viewEvents.length;
  const uniqueViews = uniqueSessions.size;
  const initiations = events.filter(e => e.eventType === "initiation").length;
  const claims = events.filter(e => e.eventType === "claim").length;
  const claimRate = totalViews > 0 ? Math.round((claims / totalViews) * 10000) / 100 : 0;
  const claimEvents = events.filter(e => e.eventType === "claim");
  let totalTimeToClaim = 0;
  let matchedClaims = 0;
  for (const claim of claimEvents) {
    const sessionViews = viewEvents.filter(v => v.sessionId === claim.sessionId);
    if (sessionViews.length > 0) {
      const firstView = sessionViews[0].timestamp;
      totalTimeToClaim += claim.timestamp - firstView;
      matchedClaims++;
    }
  }
  const avgTimeToClaimMs = matchedClaims > 0 ? Math.round(totalTimeToClaim / matchedClaims) : null;
  const perLink: Record<string, LinkStats> = {};
  for (const [, evt] of EVENTS) {
    if (!perLink[evt.linkHash]) perLink[evt.linkHash] = { linkHash: evt.linkHash, views: 0, uniqueViews: 0, initiations: 0, claims: 0, claimRate: 0, avgTimeToClaimMs: null };
  }
  for (const [hash, stats] of Object.entries(perLink)) {
    const eventIds = LINK_INDEX.get(hash);
    if (eventIds) {
      const linkEvents: RawEvent[] = [];
      for (const id of eventIds) {
        const evt = EVENTS.get(id);
        if (evt) linkEvents.push(evt);
      }
      perLink[hash] = computeLinkStats(hash, linkEvents);
    }
  }
  return { totalViews, uniqueViews, initiations, claims, claimRate, avgTimeToClaimMs, perLink };
}
