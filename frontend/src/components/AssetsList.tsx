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
    return <Image src="/media/stellarlogo.webp" alt="XLM" width={24} height={24} className="w-full h-full object-contain rounded-full bg-black p-0.5 border border-[rgba(255,255,255,0.2)]" />;
  }
  if (code === 'USDC') {
    return <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1 border border-[rgba(255,255,255,0.2)] rounded-full" />;
  }
  if (code === 'EURT') {
    return <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px] bg-[rgba(255,255,255,0.1)] text-primary border border-[rgba(255,255,255,0.2)]">€</div>;
  }
  return <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px] bg-[rgba(255,255,255,0.05)] text-secondary border border-[rgba(255,255,255,0.2)]">{code?.slice(0, 2)}</div>;
}

// Generate random sparkline data
const generateSparkline = (base: number) => {
  return Array.from({ length: 15 }, (_, i) => ({
    value: base + Math.sin(i * 0.5) * (base * 0.2) + Math.random() * (base * 0.1)
  }));
};

const AssetsList = memo(function AssetsList({ balances }: AssetsListProps) {
  const myAssets = balances.filter((b: any) => {
    if (b.asset_type === 'native') return true;
    if (!b.asset_code) return false;
    return parseFloat(b.balance) > 0;
  });

  const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);
  const allAvailable = [
    { code: 'USDC', name: 'USD Coin', sparkBase: 100 },
    { code: 'EURT', name: 'Euro Token', sparkBase: 110 },
    { code: 'yUSDC', name: 'Yield USDC', sparkBase: 105 },
  ];
  const available = allAvailable.filter(a => !existingCodes.includes(a.code));

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header border-b border-[rgba(255,255,255,0.05)] pb-3">
        <h3 className="text-lg font-extrabold text-primary">Assets</h3>
        <Link href="/assets" className="text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1">View all <ArrowRight className="w-3 h-3"/></Link>
      </div>

      <div className="panel-body flex flex-col gap-2 pt-4">
        {/* My Assets */}
        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">My Assets</span>
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
                  subtitle={isNative ? "Stellar Lumens" : code}
                  balance={parseFloat(b.balance)}
                  logo={<AssetLogo code={code} isNative={isNative} />}
                  sparklineData={generateSparkline(100)}
                />
              );
            })
          )}
        </div>

        {/* Divider */}
        {available.length > 0 && <div className="h-px bg-[rgba(255,255,255,0.05)] my-3" />}

        {/* Available Assets */}
        {available.length > 0 && (
          <>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Available</span>
            <div className="flex flex-col gap-1.5">
              {available.map((asset, i) => (
                <WalletAssetRow
                  key={i}
                  code={asset.code}
                  subtitle={asset.name}
                  logo={<AssetLogo code={asset.code} isNative={false} />}
                  sparklineData={generateSparkline(asset.sparkBase)}
                  balance={asset.code === 'USDC' ? 1250 : asset.code === 'EURT' ? 500 : 250}
                  action={
                    <Link href="/assets" className="text-[10px] font-semibold px-3 py-1 rounded border border-[rgba(255,255,255,0.1)] text-secondary hover:text-primary transition-colors bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)]">
                      Activate
                    </Link>
                  }
                />
              ))}
            </div>
          </>
        )}

        <Link href="/assets" className="mt-4 self-start text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1">
          Manage assets <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
});

export default AssetsList;
