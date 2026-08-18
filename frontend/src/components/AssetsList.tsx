"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import WalletAssetRow from "./ui/WalletAssetRow";
import { getXlmUsdPrice } from "@/lib/prices";
import { addTrustline } from "@/lib/wallet";

const COMMON_ASSETS = [
  { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', name: 'USD Coin' },
  { code: 'EURT', issuer: 'GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U', name: 'Euro Token' },
];

interface AssetsListProps {
  balances: any[];
  onManageAssets?: () => void;
  onChanged?: () => void;
}

function AssetLogo({ code, isNative }: { code: string; isNative: boolean }) {
  if (isNative || code === 'XLM') {
    return <Image src="/media/stellarlogo.webp" alt="XLM" width={24} height={24} className="h-full w-full rounded-full object-contain bg-black p-0.5" />;
  }
  if (code === 'USDC') {
    return <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="h-full w-full rounded-full object-contain p-1" />;
  }
  if (code === 'EURT') {
    return <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-accent">€</div>;
  }
  return <div className="flex h-full w-full items-center justify-center rounded-full bg-grey-50 text-[10px] font-bold text-grey-600">{code?.slice(0, 2)}</div>;
}

function assetUsdRate(code: string, xlmUsd: number): number {
  if (code === "USDC") return 1;
  if (code === "EURT") return 1.08;
  return xlmUsd > 0 ? xlmUsd : 0.182;
}

const AssetsList = memo(function AssetsList({ balances, onManageAssets, onChanged }: AssetsListProps) {
  const [xlmUsd, setXlmUsd] = useState(0);
  const [addingAsset, setAddingAsset] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getXlmUsdPrice().then(setXlmUsd);
  }, []);

  const myAssets = balances.filter((b: any) => {
    if (b.asset_type === 'native') return true;
    if (!b.asset_code) return false;
    return parseFloat(b.balance) > 0;
  });

  const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);
  const available = COMMON_ASSETS.filter(a => !existingCodes.includes(a.code));

  const handleActivate = async (code: string, issuer: string) => {
    try {
      setAddingAsset(code);
      setError("");
      await addTrustline(code, issuer);
      onChanged?.();
    } catch (err: any) {
      setError(err.message || `Failed to add ${code}`);
    } finally {
      setAddingAsset(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-bold text-grey-800">My Assets</h3>
        {onManageAssets && (
          <button onClick={onManageAssets} className="flex h-11 items-center gap-2 rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 active:bg-blue-200">
            Manage assets <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.08)] p-3 text-sm font-semibold text-error">{error}</div>}

      {myAssets.length === 0 ? (
        <div className="py-4 text-center text-xs text-grey-400">No assets activated yet</div>
      ) : (
        <div className="flex flex-col">
          {myAssets.slice(0, 3).map((b: any, i: number) => {
            const isNative = b.asset_type === "native";
            const code = isNative ? "XLM" : b.asset_code;
            return (
              <WalletAssetRow
                key={i}
                code={code}
                subtitle={isNative ? "Stellar Lumens" : code}
                balance={parseFloat(b.balance)}
                usdRate={assetUsdRate(code, xlmUsd)}
                logo={<AssetLogo code={code} isNative={isNative} />}
              />
            );
          })}
        </div>
      )}

      {available.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-base font-bold text-grey-800">Available</h3>
          <div className="flex flex-col">
            {available.map((asset, i) => {
              const isLoading = addingAsset === asset.code;
              return (
                <WalletAssetRow
                  key={i}
                  code={asset.code}
                  subtitle={asset.name}
                  usdRate={assetUsdRate(asset.code, xlmUsd)}
                  logo={<AssetLogo code={asset.code} isNative={false} />}
                  action={
                    <button onClick={() => handleActivate(asset.code, asset.issuer)} disabled={isLoading} className="inline-flex h-8 items-center rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 active:bg-blue-200 disabled:opacity-40">
                      {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                      {isLoading ? "Adding..." : "Activate"}
                    </button>
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

export default AssetsList;