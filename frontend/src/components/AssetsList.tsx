"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import stellarlogo from "../media/stellarlogo.webp";

interface AssetsListProps {
  balances: any[];
}

export default function AssetsList({ balances }: AssetsListProps) {
  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-extrabold text-slate-900">Assets</h3>
        <Link href="/assets" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View all</Link>
      </div>

      {/* My Assets */}
      <div className="flex flex-col gap-3 mb-4">
        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">My Assets</h4>
        {(() => {
          const myAssets = balances.filter((b: any) => b.asset_type === 'native' || b.asset_code);
          if (myAssets.length === 0) {
            return <div className="text-xs text-slate-400 italic py-2">No assets activated yet</div>;
          }
          return myAssets.slice(0, 3).map((b: any, i: number) => {
            const isNative = b.asset_type === "native";
            const code = isNative ? "XLM" : b.asset_code;
            const balanceVal = parseFloat(b.balance);
            let logoContent = null;
            if (isNative || code === 'XLM') {
              logoContent = <Image src={stellarlogo} alt="XLM" width={28} height={28} className="w-full h-full object-contain rounded-full bg-black p-0.5" />;
            } else if (code === 'USDC') {
              logoContent = <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />;
            } else if (code === 'EURT') {
              logoContent = <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">€</div>;
            } else {
              logoContent = <div className="w-full h-full bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px]">{code?.slice(0, 2)}</div>;
            }
            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/30 border border-slate-100/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">
                    {logoContent}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{code}</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{balanceVal.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </div>
            );
          });
        })()}
      </div>

      <div className="h-px bg-slate-100 my-2"></div>

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
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/30 border border-slate-100/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">
                    {asset.code === 'USDC' ? (
                      <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />
                    ) : asset.code === 'EURT' ? (
                      <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">€</div>
                    ) : (
                      <div className="w-full h-full bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px]">{asset.code.slice(0, 3)}</div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">{asset.code}</span>
                    <span className="text-[10px] text-slate-400">{asset.name}</span>
                  </div>
                </div>
                <Link href="/assets" className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  Activate
                </Link>
              </div>
            ))}
          </div>
        );
      })()}

      <Link href="/assets" className="mt-4 self-start text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
        Manage assets <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
