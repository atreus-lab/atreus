"use client";

import { memo } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Link2, PlusCircle, TrendingUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

interface BalanceCardProps {
  balance: string;
  showBalance: boolean;
  onToggleBalance: () => void;
  onClaimClick: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[rgba(20,20,20,0.95)] border border-[rgba(255,255,255,0.1)] p-2 rounded-xl shadow-2xl text-right backdrop-blur-md">
        <p className="text-[13px] font-bold text-white mb-0.5">${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <p className="text-[10px] text-[#94a3b8] font-medium">Jul 3, 6:30 PM</p>
      </div>
    );
  }
  return null;
};

const BalanceCard = memo(function BalanceCard({ balance, showBalance, onToggleBalance, onClaimClick }: BalanceCardProps) {
  const formattedBalance = parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currentBalance = parseFloat(balance) || 0;

  const chartData = [
    { name: '1D', value: currentBalance * 0.2 },
    { name: '1W', value: currentBalance * 0.35 },
    { name: '1M', value: currentBalance * 0.25 },
    { name: '3M', value: currentBalance * 0.6 },
    { name: '1Y', value: currentBalance * 0.5 },
    { name: 'ALL', value: currentBalance },
  ];

  return (
    <div className="lg:col-span-2 balance-hero overflow-hidden relative min-h-[360px] flex">
      
      {/* Left side (Text & Buttons) */}
      <div className="w-1/2 p-7 flex flex-col justify-between relative z-10 h-full">
        <div>
          {/* Top row: label + toggle */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">Total Balance</span>
            <button onClick={onToggleBalance} className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              {showBalance ? <Eye className="w-4 h-4 text-secondary" /> : <EyeOff className="w-4 h-4 text-secondary" />}
            </button>
          </div>

          {/* Balance value */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-5xl font-extrabold tracking-tighter text-primary tabular-nums leading-none">
              {showBalance ? formattedBalance : '••••••'}
            </span>
            <span className="text-xl font-semibold text-secondary">XLM</span>
          </div>

          {/* Change indicator */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-2.5 py-1 rounded-md">
              <ArrowUpRight className="w-3 h-3" /> 7.07%
            </span>
            <span className="text-[11px] font-medium text-[#94a3b8]">+$660.00 today</span>
          </div>
        </div>

        {/* Action buttons (square layout) */}
        <div className="flex items-center gap-3">
          <Link href="/send" className="flex flex-col items-center justify-center p-3 h-[72px] w-[72px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] transition-colors rounded-xl border border-[rgba(255,255,255,0.06)]">
            <ArrowUpRight className="w-5 h-5 mb-1 text-primary" />
            <span className="text-[11px] font-semibold text-primary">Send</span>
          </Link>
          <Link href="/receive" className="flex flex-col items-center justify-center p-3 h-[72px] w-[72px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] transition-colors rounded-xl border border-[rgba(255,255,255,0.06)]">
            <ArrowDownLeft className="w-5 h-5 mb-1 text-primary" />
            <span className="text-[11px] font-semibold text-primary">Receive</span>
          </Link>
          <Link href="/create" className="flex flex-col items-center justify-center p-3 h-[72px] w-[72px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] transition-colors rounded-xl border border-[rgba(255,255,255,0.06)]">
            <Link2 className="w-5 h-5 mb-1 text-primary" />
            <span className="text-[11px] font-semibold text-primary text-center leading-[1.2]">Create<br/>Link</span>
          </Link>
          <button onClick={onClaimClick} className="flex flex-col items-center justify-center p-3 h-[72px] w-[72px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] transition-colors rounded-xl border border-[rgba(255,255,255,0.06)]">
            <PlusCircle className="w-5 h-5 mb-1 text-primary" />
            <span className="text-[11px] font-semibold text-primary">Claim</span>
          </button>
        </div>
      </div>

      {/* Right side (Chart) */}
      <div className="w-1/2 relative">
        <div className="absolute inset-0 pt-16 pb-[70px] pr-8 opacity-90 z-0">
          {showBalance && currentBalance > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <Tooltip content={<CustomTooltip />} cursor={false} position={{ y: -30 }} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ffffff" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                  isAnimationActive={true}
                  animationDuration={1500}
                  filter="url(#glow)"
                  activeDot={{ r: 6, fill: '#fff', stroke: '#000', strokeWidth: 2 }}
                  dot={{ r: 4, fill: '#fff', stroke: '#fff', strokeWidth: 0, opacity: 0.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Graph Time Filters */}
        <div className="absolute bottom-6 right-8 flex items-center gap-3 z-10 bg-[#0a0a0a] border border-[#1a1a1a] p-1.5 rounded-lg">
          {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((label, idx) => (
            <span key={label} className={`text-[10px] font-bold cursor-pointer transition-colors px-2 py-1 rounded ${idx === 5 ? 'text-white bg-[rgba(255,255,255,0.1)]' : 'text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'}`}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

export default BalanceCard;
