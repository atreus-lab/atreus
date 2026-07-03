"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface AssetsListProps {
  balances: any[];
}

const AssetsList = memo(function AssetsList({ balances }: AssetsListProps) {
  return (
    <div className="panel flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title">Assets</h3>
        <Link href="/assets" className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>View all</Link>
      </div>

      {/* My Assets */}
      <div className="flex flex-col gap-3 mb-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>My Assets</h4>
        {(() => {
          const myAssets = balances.filter((b: any) => {
            if (b.asset_type === 'native') return true;
            if (!b.asset_code) return false;
            if (parseFloat(b.balance) > 0) return true;
            return false;
          });
          if (myAssets.length === 0) {
            return <div className="text-xs italic py-2" style={{ color: 'var(--foreground-secondary)' }}>No assets activated yet</div>;
          }
          return myAssets.slice(0, 3).map((b: any, i: number) => {
            const isNative = b.asset_type === "native";
            const code = isNative ? "XLM" : b.asset_code;
            const balanceVal = parseFloat(b.balance);
            let logoContent = null;
            if (isNative || code === 'XLM') {
              logoContent = <Image src="/media/stellarlogo.webp" alt="XLM" width={28} height={28} className="w-full h-full object-contain rounded-full bg-black p-0.5" />;
            } else if (code === 'USDC') {
              logoContent = <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />;
            } else if (code === 'EURT') {
              logoContent = <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}>€</div>;
            } else {
              logoContent = <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-secondary)' }}>{code?.slice(0, 2)}</div>;
            }
            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(30,41,59,0.6)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--background-card)' }}>
                    {logoContent}
                  </div>
                  <span className="font-bold text-sm" style={{ color: 'var(--foreground-primary)' }}>{code}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--foreground-primary)' }}>{balanceVal.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </div>
            );
          });
        })()}
      </div>

      <div className="h-px my-2" style={{ background: 'var(--border-default)' }}></div>

      {/* Available Assets */}
      {(() => {
        const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);
        const allAvailable = [
          { code: 'USDC', name: 'USD Coin' },
          { code: 'EURT', name: 'Euro Token' },
          { code: 'yUSDC', name: 'Your USDC' },
        ];
        const available = allAvailable.filter(a => !existingCodes.includes(a.code));
        if (available.length === 0) return null;
        return (
          <div className="flex flex-col gap-3 mb-2">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pt-2">Available</h4>
            {available.map((asset, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(30,41,59,0.6)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--background-card)' }}>
                    {asset.code === 'USDC' ? (
                      <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />
                    ) : asset.code === 'EURT' ? (
                      <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}>€</div>
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-secondary)' }}>{asset.code.slice(0, 3)}</div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm" style={{ color: 'var(--foreground-primary)' }}>{asset.code}</span>
                    <span className="text-[10px] text-slate-400">{asset.name}</span>
                  </div>
                </div>
                <Link href="/assets" className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--accent-primary)', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  Activate
                </Link>
              </div>
            ))}
          </div>
        );
      })()}

      <Link href="/assets" className="mt-4 self-start text-sm font-bold flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
        Manage assets <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
});

export default AssetsList;
