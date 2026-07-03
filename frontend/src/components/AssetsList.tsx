"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import WalletAssetRow from "./ui/WalletAssetRow";

interface AssetsListProps {
  balances: any[];
}

function AssetLogo({ code, isNative }: { code: string; isNative: boolean }) {
  if (isNative || code === 'XLM') {
    return <Image src="/media/stellarlogo.webp" alt="XLM" width={24} height={24} className="w-full h-full object-contain rounded-full bg-black p-0.5" />;
  }
  if (code === 'USDC') {
    return <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />;
  }
  if (code === 'EURT') {
    return <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px] bg-[rgba(59,130,246,0.15)] text-accent">€</div>;
  }
  return <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px] bg-elevated text-secondary">{code?.slice(0, 2)}</div>;
}

const AssetsList = memo(function AssetsList({ balances }: AssetsListProps) {
  const myAssets = balances.filter((b: any) => {
    if (b.asset_type === 'native') return true;
    if (!b.asset_code) return false;
    return parseFloat(b.balance) > 0;
  });

  const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);
  const allAvailable = [
    { code: 'USDC', name: 'USD Coin' },
    { code: 'EURT', name: 'Euro Token' },
    { code: 'yUSDC', name: 'Your USDC' },
  ];
  const available = allAvailable.filter(a => !existingCodes.includes(a.code));

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <h3 className="section-title">Assets</h3>
        <Link href="/assets" className="text-sm font-bold text-accent">View all</Link>
      </div>

      <div className="panel-body flex flex-col gap-2">
        {/* My Assets */}
        <span className="section-label">My Assets</span>
        <div className="flex flex-col gap-1.5 stagger-children">
          {myAssets.length === 0 ? (
            <div className="text-xs italic py-2 text-secondary">No assets activated yet</div>
          ) : (
            myAssets.slice(0, 3).map((b: any, i: number) => {
              const isNative = b.asset_type === "native";
              const code = isNative ? "XLM" : b.asset_code;
              return (
                <WalletAssetRow
                  key={i}
                  code={code}
                  balance={parseFloat(b.balance)}
                  logo={<AssetLogo code={code} isNative={isNative} />}
                />
              );
            })
          )}
        </div>

        {/* Divider */}
        {available.length > 0 && <div className="h-px bg-[var(--border-default)] my-2" />}

        {/* Available Assets */}
        {available.length > 0 && (
          <>
            <span className="section-label pt-1">Available</span>
            <div className="flex flex-col gap-1.5">
              {available.map((asset, i) => (
                <WalletAssetRow
                  key={i}
                  code={asset.code}
                  subtitle={asset.name}
                  logo={<AssetLogo code={asset.code} isNative={false} />}
                  action={
                    <Link href="/assets" className="text-[10px] font-bold px-2.5 py-1 rounded-md text-accent bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.15)] transition-colors hover:bg-[rgba(59,130,246,0.15)]">
                      Activate
                    </Link>
                  }
                />
              ))}
            </div>
          </>
        )}

        <Link href="/assets" className="mt-3 self-start text-sm font-bold text-accent flex items-center gap-1">
          Manage assets <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
});

export default AssetsList;
