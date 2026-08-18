"use client";

import { type ReactNode } from "react";

interface WalletAssetRowProps {
  code: string;
  balance?: number;
  logo: ReactNode;
  action?: ReactNode;
  subtitle?: string;
  usdRate?: number;
}

export default function WalletAssetRow({ code, balance, logo, action, subtitle, usdRate = 0.182 }: WalletAssetRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-grey-100 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden">{logo}</div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-bold text-grey-800">{code}</span>
          {subtitle && <span className="truncate text-xs text-grey-500">{subtitle}</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end text-right">
        {balance !== undefined && (
          <>
            <span className="text-sm font-bold tabular-nums text-black">
              {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs tabular-nums text-grey-400">
              ${(balance * usdRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </>
        )}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}