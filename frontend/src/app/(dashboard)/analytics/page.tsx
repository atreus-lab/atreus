"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadWallet } from "@/lib/wallet";
import { fetchSummary, fetchLinkStats } from "@/lib/analytics";
import type { LinkStats, SummaryStats, TimeSeriesPoint } from "@/lib/analytics/types";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import AnalyticsChart from "@/components/AnalyticsChart";
import { Eye, MousePointerClick, Clock, Link2, ChevronRight, Activity } from "lucide-react";

type TimeRange = "7d" | "30d" | "90d";

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [timeSeries, setTimeSeries] = useState<Record<TimeRange, TimeSeriesPoint[]>>({ "7d": [], "30d": [], "90d": [] });
  const [linkStats, setLinkStats] = useState<Record<string, LinkStats>>({});
  const [linkTimeSeries, setLinkTimeSeries] = useState<Record<string, TimeSeriesPoint[]>>({});
  const [links, setLinks] = useState<string[]>([]);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<TimeRange>("7d");

  const loadData = useCallback(async () => {
    try {
      const data = await fetchSummary();
      setStats(data.stats);
      setTimeSeries(data.timeSeries);
      setLinks(data.links);
      const linkStatsMap: Record<string, LinkStats> = {};
      const linkSeriesMap: Record<string, TimeSeriesPoint[]> = {};
      for (const hash of data.links) {
        try {
          const linkData = await fetchLinkStats(hash);
          linkStatsMap[hash] = linkData.stats;
          linkSeriesMap[hash] = linkData.timeSeries;
        } catch {
          // skip individual link errors
        }
      }
      setLinkStats(linkStatsMap);
      setLinkTimeSeries(linkSeriesMap);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    loadData();
  }, [router, loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!stats) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData, stats]);

  const fmtDuration = (ms: number | null): string => {
    if (ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3600_000)}h`;
  };

  const fmtPct = (val: number) => `${val.toFixed(1)}%`;

  const globalSeries = timeSeries[activeRange] || [];
  const linkSeries = selectedLink ? (linkTimeSeries[selectedLink] || []) : [];
  const series = selectedLink ? linkSeries : globalSeries;
  const maxY = series.reduce((max, p) => Math.max(max, p.views, p.initiations, p.claims), 0);

  let totalViews = 0, uniqueViews = 0, initiations = 0, claims = 0, claimRate = 0;
  let avgTimeToClaimMs: number | null = null;
  if (selectedLink && linkStats[selectedLink]) {
    const ls = linkStats[selectedLink];
    totalViews = ls.views;
    uniqueViews = ls.uniqueViews;
    initiations = ls.initiations;
    claims = ls.claims;
    claimRate = ls.claimRate;
    avgTimeToClaimMs = ls.avgTimeToClaimMs;
  } else if (stats) {
    totalViews = stats.totalViews;
    uniqueViews = stats.uniqueViews;
    initiations = stats.initiations;
    claims = stats.claims;
    claimRate = stats.claimRate;
    avgTimeToClaimMs = stats.avgTimeToClaimMs;
  }

  return (
    <>
      <AppHeader
        title="Analytics"
        subtitle="Payment link performance and conversion metrics"
        backHref="/dashboard"
        onSearchOpen={() => setSearchOpen(true)}
      />
      <div className="app-content">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Views" value={String(totalViews)} icon={<Eye className="w-4 h-4" />} accent="#3b82f6" />
              <StatCard label="Unique Views" value={String(uniqueViews)} icon={<Activity className="w-4 h-4" />} accent="#8b5cf6" />
              <StatCard label="Claim Rate" value={claimRate ? fmtPct(claimRate) : "0%"} icon={<MousePointerClick className="w-4 h-4" />} accent="#f59e0b" />
              <StatCard label="Avg Time to Claim" value={avgTimeToClaimMs !== null ? fmtDuration(avgTimeToClaimMs) : "—"} icon={<Clock className="w-4 h-4" />} accent="#22c55e" />
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-primary">
                  {selectedLink ? "Link Performance" : "Global Performance"}
                </h3>
                <div className="flex items-center gap-2">
                  {(["7d", "30d", "90d"] as TimeRange[]).map(range => (
                    <button
                      key={range}
                      onClick={() => setActiveRange(range)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        activeRange === range ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--background-elevated)] text-secondary hover:text-primary"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <AnalyticsChart data={series} height={320} />
              <div className="flex items-center justify-between mt-4 text-xs text-secondary">
                <span>{series.length} days of data</span>
                <span>Max Y: {maxY}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="panel p-5">
                <h3 className="text-sm font-bold text-primary mb-4">Conversion Funnel</h3>
                <FunnelChart
                  views={totalViews}
                  initiations={initiations}
                  claims={claims}
                />
              </div>

              <div className="panel p-5">
                <h3 className="text-sm font-bold text-primary mb-4">Per-Link Performance</h3>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {links.length === 0 ? (
                    <p className="text-xs text-secondary">No link data yet. Share a link to see analytics.</p>
                  ) : (
                    links.map(hash => {
                      const ls = linkStats[hash];
                      const isSelected = selectedLink === hash;
                      return (
                        <button
                          key={hash}
                          onClick={() => setSelectedLink(isSelected ? null : hash)}
                          className={`w-full text-left p-3 rounded-xl border transition-colors ${
                            isSelected ? "border-[var(--accent-primary)] bg-[var(--background-elevated)]" : "border-[var(--border-default)] hover:border-[var(--foreground-secondary)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Link2 className="w-3.5 h-3.5 shrink-0 text-secondary" />
                              <span className="text-xs font-mono text-secondary truncate">{hash.slice(0, 16)}...</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 shrink-0 text-secondary transition-transform ${isSelected ? "rotate-90" : ""}`} />
                          </div>
                          {isSelected && ls && (
                            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-[var(--border-default)]">
                              <div>
                                <p className="text-[10px] text-secondary uppercase tracking-wider">Views</p>
                                <p className="text-sm font-bold text-primary">{ls.views}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-secondary uppercase tracking-wider">Unique</p>
                                <p className="text-sm font-bold text-primary">{ls.uniqueViews}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-secondary uppercase tracking-wider">Claims</p>
                                <p className="text-sm font-bold text-primary">{ls.claims}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-secondary uppercase tracking-wider">Rate</p>
                                <p className="text-sm font-bold text-primary">{fmtPct(ls.claimRate)}</p>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="panel p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}15`, color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-secondary font-medium">{label}</p>
        <p className="text-lg font-extrabold text-primary truncate">{value}</p>
      </div>
    </div>
  );
}

function FunnelChart({ views, initiations, claims }: { views: number; initiations: number; claims: number }) {
  const max = views || 1;
  const vW = Math.round((views / max) * 100);
  const iW = Math.round((initiations / max) * 100);
  const cW = Math.round((claims / max) * 100);
  return (
    <div className="space-y-3">
      <FunnelStep label="Views" value={views} width={vW} color="#3b82f6" />
      <FunnelStep label="Initiated" value={initiations} width={iW} color="#f59e0b" />
      <FunnelStep label="Completed" value={claims} width={cW} color="#22c55e" />
    </div>
  );
}

function FunnelStep({ label, value, width, color }: { label: string; value: number; width: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-secondary">{label}</span>
        <span className="font-bold text-primary">{value}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--background-elevated)]">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}
