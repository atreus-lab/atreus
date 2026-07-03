"use client";

import { memo } from "react";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";

const PrivacyScoreCard = memo(function PrivacyScoreCard() {
  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <h3 className="section-title flex items-center gap-2">
          Privacy Score <Shield className="w-4 h-4 text-secondary" />
        </h3>
      </div>

      <div className="panel-body flex flex-col gap-4">
        <div className="flex items-center gap-5">
          {/* Ring chart */}
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-default)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-primary)" strokeWidth="10" strokeDasharray="251" strokeDashoffset="0" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-accent">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          {/* Score text */}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-success">Excellent</span>
            <span className="text-3xl font-black tracking-tight text-primary">100%</span>
            <span className="text-[11px] text-secondary leading-snug mt-0.5">
              No identity leaks detected.
            </span>
          </div>
        </div>

        <Link href="/security" className="flex items-center gap-1 text-sm font-bold text-accent">
          View details <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
});

export default PrivacyScoreCard;
