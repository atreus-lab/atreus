export type EventType = "view" | "initiation" | "claim";

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
