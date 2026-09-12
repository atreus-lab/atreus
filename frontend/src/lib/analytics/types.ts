export type EventType = "view" | "initiation" | "claim";

export interface SummaryStats {
  totalViews: number;
  uniqueViews: number;
  initiations: number;
  claims: number;
  claimRate: number;
  avgTimeToClaimMs: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  initiations: number;
  claims: number;
}
