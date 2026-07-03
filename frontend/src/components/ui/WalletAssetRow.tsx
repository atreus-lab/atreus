"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface WalletAssetRowProps {
  code: string;
  balance?: number;
  logo: ReactNode;
  action?: ReactNode;
  subtitle?: string;
  sparklineData?: any[];
}

export default function WalletAssetRow({ code, balance, logo, action, subtitle, sparklineData }: WalletAssetRowProps) {
  return (
    <div className="asset-row flex items-center justify-between">
      <div className="flex items-center gap-3 w-1/3">
        <div className="asset-logo">{logo}</div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-primary">{code}</span>
          {subtitle && <span className="text-[10px] text-secondary">{subtitle}</span>}
        </div>
      </div>
      
      {sparklineData && (
        <div className="w-1/3 h-6 opacity-40 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <defs>
                <filter id="glowSpark" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <Line type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={1} dot={false} isAnimationActive={false} filter="url(#glowSpark)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-col items-end w-1/3 text-right">
        {balance !== undefined && (
          <>
            <span className="font-bold text-sm text-primary tabular-nums">
              {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-secondary tabular-nums">
              ${(balance * 0.182).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </>
        )}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
