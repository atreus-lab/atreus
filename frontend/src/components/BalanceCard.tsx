"use client";

import { memo } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Link2, PlusCircle, TrendingUp } from "lucide-react";

interface BalanceCardProps {
  balance: string;
  showBalance: boolean;
  onToggleBalance: () => void;
  onClaimClick: () => void;
}

const BalanceCard = memo(function BalanceCard({ balance, showBalance, onToggleBalance, onClaimClick }: BalanceCardProps) {
  const formattedBalance = parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="lg:col-span-2 balance-hero">
      {/* Top row: label + toggle */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Total Balance</span>
        <button onClick={onToggleBalance} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
          {showBalance ? <Eye className="w-4 h-4 text-secondary" /> : <EyeOff className="w-4 h-4 text-secondary" />}
        </button>
      </div>

      {/* Balance value — typography-driven, no gradient */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary tabular-nums">
          {showBalance ? formattedBalance : '••••••'}
        </span>
        <span className="text-lg font-semibold text-secondary">XLM</span>
      </div>

      {/* Change indicator */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
          <TrendingUp className="w-3 h-3" /> +7.07%
        </span>
        <span className="text-xs text-secondary">+$660.00 today</span>
      </div>

      {/* Action buttons — compact pills */}
      <div className="balance-hero-actions">
        <Link href="/send" className="balance-hero-btn">
          <ArrowUpRight className="w-4 h-4 text-accent" /> Send
        </Link>
        <Link href="/receive" className="balance-hero-btn">
          <ArrowDownLeft className="w-4 h-4 text-accent" /> Receive
        </Link>
        <Link href="/create" className="balance-hero-btn">
          <Link2 className="w-4 h-4 text-accent" /> Create Link
        </Link>
        <button onClick={onClaimClick} className="balance-hero-btn">
          <PlusCircle className="w-4 h-4 text-accent" /> Claim
        </button>
      </div>
    </div>
  );
});

export default BalanceCard;
