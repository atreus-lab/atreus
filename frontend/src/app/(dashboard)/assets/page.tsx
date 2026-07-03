"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loadWallet, getBalances, addTrustline, type StoredWallet } from "@/lib/wallet";
import { Loader2, Check, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import WalletAssetRow from "@/components/ui/WalletAssetRow";
import EmptyState from "@/components/ui/EmptyState";

const COMMON_ASSETS = [
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", name: "USD Coin" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U", name: "Euro Token" },
];

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
  return <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-[10px] bg-elevated text-secondary">{code?.slice(0, 3)}</div>;
}

export default function AssetsPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [address, setAddress] = useState("");
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingAsset, setAddingAsset] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customIssuer, setCustomIssuer] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const loadBalances = async (addr: string) => { const bals = await getBalances(addr); setBalances(bals); };

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet); setAddress(wallet.publicKey);
    loadBalances(wallet.publicKey).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleAddAsset = async (code: string, issuer: string) => {
    try { setAddingAsset(code); setError(""); setSuccess(""); await addTrustline(code, issuer); setSuccess(`${code} trustline added successfully!`); await loadBalances(address); }
    catch (err: any) { setError(err.message || `Failed to add ${code}`); }
    finally { setAddingAsset(null); }
  };

  const handleAddCustom = async () => {
    if (!customCode || !customIssuer) { setError("Enter both asset code and issuer"); return; }
    await handleAddAsset(customCode.trim(), customIssuer.trim());
  };

  const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);

  return (
    <>
      <AppHeader title="Assets" subtitle="Manage your tokens and trustlines" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* My Assets */}
            <div className="panel flex flex-col">
              <div className="panel-header">
                <h3 className="section-title">My Assets</h3>
                <span className="text-xs font-bold text-secondary">{balances.length} token{balances.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="panel-body flex flex-col gap-2">
                {balances.length > 0 ? balances.filter((b: any) => {
                  const isNative = b.asset_type === "native";
                  const code = isNative ? "XLM" : b.asset_code;
                  const known = COMMON_ASSETS.find(t => t.code === code && t.issuer === b.asset_issuer);
                  return isNative || parseFloat(b.balance) > 0 || known;
                }).map((b: any, i: number) => {
                  const isNative = b.asset_type === "native";
                  const code = isNative ? "XLM" : b.asset_code;
                  return (
                    <WalletAssetRow
                      key={i}
                      code={code}
                      balance={parseFloat(b.balance)}
                      subtitle={b.asset_issuer ? `Issuer: ${b.asset_issuer.slice(0, 8)}...` : undefined}
                      logo={<AssetLogo code={code} isNative={isNative} />}
                    />
                  );
                }) : (
                  <EmptyState
                    icon={<Plus className="w-6 h-6" />}
                    title="No assets found"
                    description="Add a token below to get started."
                  />
                )}
              </div>
            </div>

            {/* Available Assets */}
            <div className="panel flex flex-col">
              <div className="panel-header">
                <h3 className="section-title">Available Assets</h3>
              </div>
              <div className="panel-body flex flex-col gap-3">
                {error && <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-error">{error}</div>}
                {success && <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.15)] text-success flex items-center gap-2"><Check className="w-4 h-4" /> {success}</div>}
                
                {COMMON_ASSETS.map((asset) => {
                  const alreadyAdded = existingCodes.includes(asset.code);
                  const isLoading = addingAsset === asset.code;
                  return (
                    <WalletAssetRow
                      key={asset.code}
                      code={asset.code}
                      subtitle={asset.name}
                      logo={<AssetLogo code={asset.code} isNative={false} />}
                      action={
                        alreadyAdded ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-[rgba(34,197,94,0.08)] text-success"><Check className="w-3 h-3" /> Active</span>
                        ) : (
                          <button onClick={() => handleAddAsset(asset.code, asset.issuer)} disabled={isLoading} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-[var(--accent-primary)] text-white disabled:opacity-50 transition-colors">
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            {isLoading ? "Adding..." : "Activate"}
                          </button>
                        )
                      }
                    />
                  );
                })}

                {/* Custom Asset */}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-sm mb-3 text-primary">Custom Asset</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                      <label className="section-label">Asset Code</label>
                      <input value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase())} placeholder="e.g. RANDOM" className="input text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="section-label">Issuer Public Key</label>
                      <input value={customIssuer} onChange={e => setCustomIssuer(e.target.value)} placeholder="G..." className="input text-sm font-mono" />
                    </div>
                  </div>
                  <button onClick={handleAddCustom} disabled={!!addingAsset || !customCode || !customIssuer} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold">
                    {addingAsset === "custom" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {addingAsset === "custom" ? "Adding..." : "Activate Custom Asset"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}
