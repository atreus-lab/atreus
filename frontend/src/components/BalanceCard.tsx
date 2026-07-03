"use client";

import { memo, useMemo } from "react";
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

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary tabular-nums">
            {showBalance ? (
              <NumberTicker value={numericBalance} duration={1.2} locale />
            ) : '••••••'}
          </span>
          <span className="text-lg font-semibold text-secondary">XLM</span>
        </div>

        {showBalance && (
          <div className="flex items-center gap-3 shrink-0">
            <SparklineChart data={chartData} width={100} height={32} positive={positive} />
            <div className="flex flex-col items-start gap-0.5 min-w-[72px]">
              <span className={`text-sm font-bold tabular-nums flex items-center gap-1 ${positive ? "text-success" : "text-error"}`}>
                {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {positive ? "+" : ""}{pctChange.toFixed(1)}%
              </span>
              <span className="text-[11px] font-medium text-secondary">past week</span>
            </div>
          </div>
        )}
      </div>

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
