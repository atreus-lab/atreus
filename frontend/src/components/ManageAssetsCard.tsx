"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, Loader2, Plus } from "lucide-react";
import WalletAssetRow from "./ui/WalletAssetRow";
import { getBalances, addTrustline } from "@/lib/wallet";
import { getXlmUsdPrice } from "@/lib/prices";

const COMMON_ASSETS = [
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", name: "USD Coin" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U", name: "Euro Token" },
];

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

interface ManageAssetsCardProps {
  publicKey: string;
  onBack: () => void;
  onChanged?: () => void;
}

export default function ManageAssetsCard({ publicKey, onBack, onChanged }: ManageAssetsCardProps) {
  const [balances, setBalances] = useState<any[]>([]);
  const [xlmUsd, setXlmUsd] = useState(0);
  const [addingAsset, setAddingAsset] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customIssuer, setCustomIssuer] = useState("");

  const loadBalances = async () => {
    try {
      const bals = await getBalances(publicKey);
      setBalances(bals);
    } catch {}
  };

  useEffect(() => {
    loadBalances();
    getXlmUsdPrice().then(setXlmUsd);
  }, [publicKey]);

  const handleAddAsset = async (code: string, issuer: string) => {
    try {
      setAddingAsset(code);
      setError("");
      setSuccess("");
      await addTrustline(code, issuer);
      setSuccess(`${code} trustline added successfully!`);
      await loadBalances();
      onChanged?.();
    } catch (err: any) {
      setError(err.message || `Failed to add ${code}`);
    } finally {
      setAddingAsset(null);
    }
  };

  const handleAddCustom = async () => {
    if (!customCode || !customIssuer) { setError("Enter both asset code and issuer"); return; }
    await handleAddAsset(customCode.trim(), customIssuer.trim());
  };

  const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);
  const myAssets = balances.filter((b: any) => {
    if (b.asset_type === 'native') return true;
    if (!b.asset_code) return false;
    return parseFloat(b.balance) > 0 || COMMON_ASSETS.some(a => a.code === b.asset_code && a.issuer === b.asset_issuer);
  });

  return (
    <div className="text-center">
      <div className="flex-col text-left">
        <button onClick={onBack} className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Manage Assets</h4>
        <p className="mb-4 text-left text-sm font-normal text-grey-700 mobile:text-base">Activate new tokens or add a custom asset to your wallet.</p>

        {error && <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.08)] p-3 text-sm font-semibold text-error">{error}</div>}
        {success && <div className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.08)] p-3 text-sm font-semibold text-success"><Check className="h-4 w-4" /> {success}</div>}

        <h5 className="mb-1 mt-2 text-xs font-bold text-grey-500">My Assets</h5>
        {myAssets.length === 0 ? (
          <div className="py-4 text-center text-xs text-grey-400">No assets activated yet</div>
        ) : (
          <div className="flex flex-col">
            {myAssets.map((b: any, i: number) => {
              const isNative = b.asset_type === "native";
              const code = isNative ? "XLM" : b.asset_code;
              return (
                <WalletAssetRow
                  key={i}
                  code={code}
                  subtitle={isNative ? "Stellar Lumens" : b.asset_issuer ? `Issuer: ${b.asset_issuer.slice(0, 8)}...` : code}
                  balance={parseFloat(b.balance)}
                  usdRate={assetUsdRate(code, xlmUsd)}
                  logo={<AssetLogo code={code} isNative={isNative} />}
                />
              );
            })}
          </div>
        )}

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">Available</h5>
        <div className="flex flex-col">
          {COMMON_ASSETS.map((asset) => {
            const alreadyAdded = existingCodes.includes(asset.code);
            const isLoading = addingAsset === asset.code;
            return (
              <WalletAssetRow
                key={asset.code}
                code={asset.code}
                subtitle={asset.name}
                usdRate={assetUsdRate(asset.code, xlmUsd)}
                logo={<AssetLogo code={asset.code} isNative={false} />}
                action={
                  alreadyAdded ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-success"><Check className="h-3 w-3" /> Active</span>
                  ) : (
                    <button onClick={() => handleAddAsset(asset.code, asset.issuer)} disabled={isLoading} className="inline-flex h-8 items-center rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 active:bg-blue-200 disabled:opacity-40">
                      {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
                      {isLoading ? "Adding..." : "Activate"}
                    </button>
                  )
                }
              />
            );
          })}
        </div>

        <h5 className="mb-2 mt-5 text-xs font-bold text-grey-500">Custom Asset</h5>
        <div className="rounded-lg border border-grey-100 bg-white p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-grey-500">Asset Code</label>
              <input value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase())} placeholder="e.g. RANDOM" className="!h-11 w-full rounded-lg border border-solid border-grey-100 !bg-white px-4 py-2 text-left text-grey-800 outline-none focus:border-[#007CBF]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-grey-500">Issuer Public Key</label>
              <input value={customIssuer} onChange={e => setCustomIssuer(e.target.value)} placeholder="G..." className="!h-11 w-full rounded-lg border border-solid border-grey-100 !bg-white px-4 py-2 text-left font-mono text-grey-800 outline-none focus:border-[#007CBF]" />
            </div>
          </div>
          <button onClick={handleAddCustom} disabled={!!addingAsset || !customCode || !customIssuer} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primaryBlue px-4 text-sm font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
            {addingAsset === "custom" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {addingAsset === "custom" ? "Adding..." : "Activate Custom Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}