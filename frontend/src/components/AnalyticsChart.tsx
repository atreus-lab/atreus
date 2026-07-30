"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { TimeSeriesPoint } from "@/lib/analytics/types";

interface AnalyticsChartProps {
  data: TimeSeriesPoint[];
  height?: number;
}

export default function AnalyticsChart({ data, height = 320 }: AnalyticsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInitiation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
        <XAxis
          dataKey="date"
          stroke="var(--foreground-secondary)"
          style={{ fontSize: "12px" }}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis stroke="var(--foreground-secondary)" style={{ fontSize: "12px" }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--background-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px" }}
          labelStyle={{ color: "var(--foreground-primary)" }}
        />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
        <Area type="monotone" dataKey="views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" name="Views" strokeWidth={2} />
        <Area type="monotone" dataKey="initiations" stroke="#f59e0b" fillOpacity={1} fill="url(#colorInitiation)" name="Initiation" strokeWidth={2} />
        <Area type="monotone" dataKey="claims" stroke="#22c55e" fillOpacity={1} fill="url(#colorClaims)" name="Claims" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
