"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Shield, ChevronDown, ArrowRight } from "lucide-react";
import shieldImg from "../media/Shield1.png";

const PrivacyScoreCard = memo(function PrivacyScoreCard() {
  return (
    <div className="panel flex flex-col relative overflow-hidden h-full">
      <div className="panel-header">
        <h3 className="section-title flex items-center gap-2">
          Privacy Score <Shield className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
        </h3>
        <ChevronDown className="w-4 h-4" style={{ color: 'var(--foreground-secondary)', cursor: 'pointer' }} />
      </div>

      <div className="panel-body flex items-center gap-6 z-10">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="251" strokeDashoffset="0" strokeLinecap="round" className="animate-[dash_1.5s_ease-out_forwards]" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--accent-primary)' }}>
            <Shield className="w-8 h-8" style={{ fill: 'rgba(59, 130, 246, 0.15)' }} />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold mb-1" style={{ color: 'var(--success)' }}>Excellent</span>
          <span className="text-4xl font-black tracking-tight" style={{ color: 'var(--foreground-primary)' }}>100%</span>
          <span className="text-[11px] font-semibold mt-1 leading-snug" style={{ color: 'var(--foreground-secondary)' }}>
            You&apos;re doing great!<br />No identity leaks detected.
          </span>
        </div>
      </div>

      <div className="panel-footer" style={{ justifyContent: 'flex-start' }}>
        <Link href="/security" className="flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
          View details <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-48 h-48 opacity-20 pointer-events-none mix-blend-multiply">
        <Image src={shieldImg} alt="Shield" fill className="object-contain drop-shadow-xl" />
      </div>
    </div>
  );
});

export default PrivacyScoreCard;
