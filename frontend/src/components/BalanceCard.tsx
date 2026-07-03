"use client";

import { memo } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Link2, PlusCircle, ChevronDown } from "lucide-react";

interface BalanceCardProps {
  balance: string;
  showBalance: boolean;
  onToggleBalance: () => void;
  onClaimClick: () => void;
}

const BalanceCard = memo(function BalanceCard({ balance, showBalance, onToggleBalance, onClaimClick }: BalanceCardProps) {
  return (
    <div className="lg:col-span-2 relative rounded-[2rem] p-8 text-white overflow-hidden flex flex-col justify-between min-h-[300px]" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1e40af, #3730a3)' }}>
      <svg className="absolute bottom-16 left-0 w-full h-[150px] opacity-40 mix-blend-overlay pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0 100 L0 70 Q10 80, 20 60 T40 50 T60 30 T80 40 T100 10 L100 100 Z" fill="rgba(255,255,255,0.1)" />
        <path d="M0 70 Q10 80, 20 60 T40 50 T60 30 T80 40 T100 10" fill="none" stroke="white" strokeWidth="1.5" />
        <circle cx="100" cy="10" r="2" fill="white" />
      </svg>

      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2 font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Total Balance
            <button onClick={onToggleBalance} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              {showBalance ? <Eye className="w-4 h-4 opacity-70" /> : <EyeOff className="w-4 h-4 opacity-70" />}
            </button>
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
            {showBalance ? parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '********'}
            <span className="text-2xl font-bold opacity-80"> XLM</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-white/20 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-white/20">
              <ArrowUpRight className="w-3 h-3" /> 7.07%
            </span>
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>+$660.00 today</span>
          </div>
        </div>
        <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
          1D <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 relative z-10 mt-12">
        <Link href="/send" className="flex-1 min-w-[120px] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-primary)' }}>
          <ArrowUpRight className="w-4 h-4 text-blue-500" /> Send
        </Link>
        <Link href="/receive" className="flex-1 min-w-[120px] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-primary)' }}>
          <ArrowDownLeft className="w-4 h-4 text-blue-500" /> Receive
        </Link>
        <Link href="/create" className="flex-1 min-w-[120px] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-primary)' }}>
          <Link2 className="w-4 h-4 text-blue-500" /> Create Link
        </Link>
        <button onClick={onClaimClick} className="flex-1 min-w-[120px] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-primary)' }}>
          <PlusCircle className="w-4 h-4 text-blue-500" /> Claim Link
        </button>
      </div>
    </div>
  );
});

export default BalanceCard;
