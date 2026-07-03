"use client";

import Image from "next/image";
import { type ReactNode } from "react";

interface WalletAssetRowProps {
  code: string;
  balance?: number;
  logo: ReactNode;
  action?: ReactNode;
  subtitle?: string;
}

export default function WalletAssetRow({ code, balance, logo, action, subtitle }: WalletAssetRowProps) {
  return (
    <div className="asset-row">
      <div className="flex items-center gap-3">
        <div className="asset-logo">{logo}</div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-primary">{code}</span>
          {subtitle && <span className="text-[10px] text-secondary">{subtitle}</span>}
        </div>
      </div>
      {balance !== undefined && (
        <span className="font-bold text-sm text-primary tabular-nums">
          {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </span>
      )}
      {action}
    </div>
  );
}
