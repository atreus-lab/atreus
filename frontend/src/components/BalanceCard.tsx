"use client";

import { memo } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Link2, PlusCircle } from "lucide-react";
import { NumberTicker } from "./motion/number-ticker";
import { motion } from "motion/react";
import { SPRING_PRESS } from "@/lib/ease";

interface BalanceCardProps {
  balance: string;
  showBalance: boolean;
  onToggleBalance: () => void;
  onClaimClick: () => void;
  onCreateLinkClick: () => void;
}

const BalanceCard = memo(function BalanceCard({ balance, showBalance, onToggleBalance, onClaimClick, onCreateLinkClick }: BalanceCardProps) {
  const numericBalance = parseFloat(balance);

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

      <div className="flex items-baseline gap-2">
        <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary tabular-nums">
          {showBalance ? (
            <NumberTicker value={numericBalance} duration={1.2} locale />
          ) : '••••••'}
        </span>
        <span className="text-lg font-semibold text-secondary">XLM</span>
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
