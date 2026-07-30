import type { EventType, LinkStats, SummaryStats, TimeSeriesPoint } from "@/lib/analytics/types";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function getSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  let id = sessionStorage.getItem("atreus_analytics_session");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("atreus_analytics_session", id);
  }
  return id;
}

export async function recordEvent(linkHash: string, eventType: EventType): Promise<void> {
  try {
    await fetch(`${backendUrl}/api/analytics/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkHash, eventType, sessionId: getSessionId(), timestamp: Date.now() }),
      keepalive: true,
    });
  } catch {
    // swallow analytics failures — they must never break the app
  }
}

export async function fetchLinkStats(linkHash: string): Promise<{ stats: LinkStats; timeSeries: TimeSeriesPoint[] }> {
  const res = await fetch(`${backendUrl}/api/analytics/links/${encodeURIComponent(linkHash)}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load link stats");
  return res.json();
}

export async function fetchSummary(): Promise<{
  stats: SummaryStats;
  timeSeries: { "7d": TimeSeriesPoint[]; "30d": TimeSeriesPoint[]; "90d": TimeSeriesPoint[] };
  links: string[];
}> {
  const res = await fetch(`${backendUrl}/api/analytics/summary?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load analytics summary");
  return res.json();
}
