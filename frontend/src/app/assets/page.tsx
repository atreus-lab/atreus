"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, getBalances, addTrustline, type StoredWallet } from "@/lib/wallet";
import { Loader2, Check, Plus, ArrowLeft } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import { getNavItems } from "@/constants/navigation";

const COMMON_ASSETS = [
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", name: "USD Coin" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U", name: "Euro Token" },
];

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

  if (loading) {
    return <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = address ? `${address.slice(0, 5)}...${address.slice(-4)}` : '';
  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />
      <main className="flex-1 flex flex-col min-w-0">
        <AppHeader title="Assets" subtitle="Manage your tokens and trustlines" onSearchOpen={() => setSearchOpen(true)} />
        <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6 pt-6">
          <div><Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link></div>

          {/* My Assets */}
          <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-slate-900 text-xl">My Assets</h3>
              <span className="text-xs font-bold text-slate-400">{balances.length} token{balances.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col gap-3">
              {balances.length > 0 ? balances.filter((b: any) => {
                const isNative = b.asset_type === "native";
                const code = isNative ? "XLM" : b.asset_code;
                const known = COMMON_ASSETS.find(t => t.code === code && t.issuer === b.asset_issuer);
                return isNative || parseFloat(b.balance) > 0 || known;
              }).map((b: any, i: number) => {
                const isNative = b.asset_type === "native";
                const code = isNative ? "XLM" : b.asset_code;
                const balanceVal = parseFloat(b.balance);
                let logoContent = null;
                if (isNative || code === 'XLM') { logoContent = <Image src="/media/stellarlogo.webp" alt="XLM" width={28} height={28} className="w-full h-full object-contain rounded-full bg-black p-0.5" />; }
                else if (code === 'USDC') { logoContent = <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />; }
                else if (code === 'EURT') { logoContent = <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">€</div>; }
                else { logoContent = <div className="w-full h-full bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px]">{code?.slice(0, 3)}</div>; }
                return (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/30 border border-slate-100/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">{logoContent}</div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{code}</span>
                        {b.asset_issuer && <span className="text-[10px] font-mono text-slate-400">Issuer: {b.asset_issuer.slice(0, 8)}...</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-slate-900 text-sm">{balanceVal.toLocaleString(undefined, { maximumFractionDigits: 7 })}</span>
                      <span className="text-[10px] font-semibold text-slate-400">≈ $0.00</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4"><Loader2 className="w-6 h-6 text-slate-400" /></div>
                  <span className="font-bold text-slate-500 text-sm">No assets found</span>
                  <span className="text-xs text-slate-400 mt-1">Add a token below to get started.</span>
                </div>
              )}
            </div>
          </div>

          {/* Available Assets */}
          <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
            <h3 className="font-extrabold text-slate-900 text-xl mb-6">Available Assets</h3>
            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium p-4 rounded-xl mb-4">{error}</div>}
            {success && <div className="bg-green-50 border border-green-100 text-green-600 text-sm font-medium p-4 rounded-xl mb-4 flex items-center gap-2"><Check className="w-4 h-4" /> {success}</div>}
            <div className="flex flex-col gap-3">
              {COMMON_ASSETS.map((asset) => {
                const alreadyAdded = existingCodes.includes(asset.code);
                const isLoading = addingAsset === asset.code;
                return (
                  <div key={asset.code} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/30 border border-slate-100/60">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">
                        {asset.code === 'USDC' ? <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />
                        : asset.code === 'EURT' ? <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">€</div>
                        : <div className="w-full h-full bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px]">{asset.code.slice(0, 3)}</div>}
                      </div>
                      <div className="flex flex-col"><span className="font-bold text-slate-900 text-sm">{asset.code}</span><span className="text-[11px] text-slate-500 font-medium">{asset.name}</span></div>
                    </div>
                    {alreadyAdded ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100"><Check className="w-3.5 h-3.5" /> Active</span>
                    ) : (
                      <button onClick={() => handleAddAsset(asset.code, asset.issuer)} disabled={isLoading} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-[0_2px_8px_rgba(79,70,229,0.25)]">
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {isLoading ? "Adding..." : "Activate"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Asset */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm mb-4">Custom Asset</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Code</label>
                  <input value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase())} placeholder="e.g. RANDOM" className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issuer Public Key</label>
                  <input value={customIssuer} onChange={e => setCustomIssuer(e.target.value)} placeholder="G..." className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium font-mono focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" />
                </div>
              </div>
              <button onClick={handleAddCustom} disabled={!!addingAsset || !customCode || !customIssuer} className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
                {addingAsset === "custom" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingAsset === "custom" ? "Adding..." : "Activate Custom Asset"}
              </button>
            </div>
          </div>
        </div>
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
      </main>
    </div>
  );
}
