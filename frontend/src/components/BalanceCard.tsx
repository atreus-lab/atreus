"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Link2, PlusCircle, TrendingUp, TrendingDown } from "lucide-react";
import { NumberTicker } from "./motion/number-ticker";
import { SparklineChart } from "./SparklineChart";
import { motion } from "motion/react";
import { SPRING_PRESS } from "@/lib/ease";

interface BalanceCardProps {
  balance: string;
  showBalance: boolean;
  onToggleBalance: () => void;
  onClaimClick: () => void;
  onCreateLinkClick: () => void;
}

function generateWalk(balance: number, steps: number): number[] {
  let seed = Math.round(balance * 1000) || Date.now();
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed % 100) / 100;
  };
  const points: number[] = [];
  let current = balance * 0.985;
  for (let i = 0; i < steps; i++) {
    const change = (next() - 0.48) * 0.008 * balance;
    current += change;
    points.push(Math.max(0, current));
  }
  return points;
}

const BalanceCard = memo(function BalanceCard({ balance, showBalance, onToggleBalance, onClaimClick, onCreateLinkClick }: BalanceCardProps) {
  const numericBalance = parseFloat(balance);

  const chartData = useMemo(() => generateWalk(numericBalance, 24), [numericBalance]);

  const startVal = chartData[0];
  const endVal = chartData[chartData.length - 1];
  const pctChange = ((endVal - startVal) / startVal) * 100;
  const positive = pctChange >= 0;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeIndex = hoverIndex ?? chartData.length - 1;
  const activePct = ((chartData[activeIndex] - startVal) / startVal) * 100;
  const activePositive = activePct >= 0;
  const displayBalance = hoverIndex !== null ? chartData[hoverIndex] : numericBalance;

  return (
    <div className="lg:col-span-2 balance-hero">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary uppercase tracking-wider">
          <span className="live-dot" />
          Total Balance
        </span>
        <button onClick={onToggleBalance} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
          {showBalance ? <Eye className="w-4 h-4 text-secondary" /> : <EyeOff className="w-4 h-4 text-secondary" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary tabular-nums leading-none">
          {showBalance ? (
            <NumberTicker value={displayBalance} duration={hoverIndex !== null ? 0.3 : 1.2} stagger={hoverIndex !== null ? 0.015 : 0.04} locale />
          ) : '••••••'}
        </span>
        <span className="text-lg font-semibold text-secondary leading-none">XLM</span>
      </div>

      {showBalance && (
        <div className="mt-4 w-full flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <SparklineChart
              data={chartData}
              positive={positive}
              onHoverIndexChange={setHoverIndex}
              renderTooltip={(idx) => (
                <div className="rounded-lg bg-[rgba(20,20,20,0.92)] border border-[rgba(255,255,255,0.08)] px-2.5 py-1 shadow-lg backdrop-blur-sm whitespace-nowrap">
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    <NumberTicker
                      value={Math.round(chartData[idx] * 100)}
                      format={(v) => (v / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      suffix=" XLM"
                      duration={0.25}
                      stagger={0.015}
                      startOnView={false}
                    />
                  </span>
                </div>
              )}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] font-medium text-secondary">
              {hoverIndex !== null ? "at hovered point" : "past week"}
            </span>
            <span className={`text-sm font-bold tabular-nums flex items-center gap-1 ${activePositive ? "text-success" : "text-error"}`}>
              {activePositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <NumberTicker
                value={Math.round(activePct * 10)}
                format={(v) => Math.abs(v / 10).toFixed(1)}
                prefix={activePositive ? "+" : "-"}
                suffix="%"
                duration={0.35}
                stagger={0.02}
                startOnView={false}
              />
            </span>
          </div>
        </div>
      )}

      <div className="balance-hero-actions">
        <Link href="/send" className="balance-hero-btn">
          <ArrowUpRight className="w-4 h-4 text-accent" /> Send
        </Link>
        <Link href="/receive" className="balance-hero-btn">
          <ArrowDownLeft className="w-4 h-4 text-accent" /> Receive
        </Link>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={SPRING_PRESS}
          onClick={onCreateLinkClick}
          className="balance-hero-btn"
        >
          <Link2 className="w-4 h-4 text-accent" /> Create Link
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={SPRING_PRESS}
          onClick={onClaimClick}
          className="balance-hero-btn"
        >
          <PlusCircle className="w-4 h-4 text-accent" /> Claim
        </motion.button>
      </div>
    </div>
  );
});

export default BalanceCard;
