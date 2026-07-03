"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, getBalances, addTrustline, type StoredWallet } from "@/lib/wallet";
import { 
 LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
 Settings, Search, Bell, ChevronDown, Loader2, Check, Plus, ArrowLeft
} from "lucide-react";
import logo from "../../media/ateruslogo.jpeg";
import stellarlogo from "../../media/stellarlogo.webp";

const COMMON_ASSETS = [
  { code: "USDC", issuer: "GA2BYV7QJ75ZAZXQBEDX5CAYXIRMXELJYRK5O6IHF2RLCDKVQU2ZSKBU", name: "USD Coin" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U", name: "Euro Token" },
  { code: "yUSDC", issuer: "GA2BYV7QJ75ZAZXQBEDX5CAYXIRMXELJYRK5O6IHF2RLCDKVQU2ZSKBU", name: "Your USDC" },
];

const navItems = [
 { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
 { icon: Wallet, label: "Wallet", href: "/wallet" },
 { icon: Link2, label: "Payment Links" },
 { icon: ArrowRightLeft, label: "Swap" },
 { icon: BarChart3, label: "Analytics" },
 { icon: Activity, label: "Activity", href: "/activity" },
 { icon: Shield, label: "Security" },
 { icon: Settings, label: "Settings", href: "/settings" },
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

  const loadBalances = async (addr: string) => {
    const bals = await getBalances(addr);
    setBalances(bals);
  };

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    setAddress(wallet.publicKey);
    loadBalances(wallet.publicKey).finally(() => setLoading(false));
  }, [router]);

  const handleAddAsset = async (code: string, issuer: string) => {
    try {
      setAddingAsset(code);
      setError("");
      setSuccess("");
      const hash = await addTrustline(code, issuer);
      setSuccess(`${code} trustline added successfully!`);
      await loadBalances(address);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = address ? `${address.slice(0, 5)}...${address.slice(-4)}` : '';

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
     
     {/* Sidebar */}
     <aside className="w-[280px] bg-white border-r border-slate-100 hidden lg:flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-20 overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-8 pb-4 shrink-0">
       <Link href="/" className="flex items-center gap-3 px-2 cursor-pointer hover:opacity-80 transition-opacity">
        <Image src={logo} alt="Atreus" width={32} height={32} className="rounded-[10px] shadow-sm" />
        <span className="font-extrabold text-xl tracking-tight text-slate-900">Atreus</span>
       </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-1.5 py-2">
       {navItems.map((item, i) => {
        if (item.href) {
         return (
          <Link key={i} href={item.href} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer text-slate-500 hover:bg-slate-50 hover:text-slate-900">
           <item.icon className="w-5 h-5 text-slate-400" />
           {item.label}
          </Link>
         );
        }
        return (
         <div key={i} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer text-slate-500 hover:bg-slate-50 hover:text-slate-900">
          <item.icon className="w-5 h-5 text-slate-400" />
          {item.label}
         </div>
        );
       })}
      </nav>

      {/* Bottom */}
      <div className="px-6 pb-6 pt-3 shrink-0 flex flex-col gap-3">
       <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
         <Shield className="w-4 h-4 text-slate-400" />
         <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Built on Stellar</span>
         <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
        </div>
        <p className="text-[12px] font-medium text-slate-500 leading-snug">Fast. Low cost. Borderless payments.</p>
       </div>

       <Link href="/profile" className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm group">
        <div className="flex items-center gap-3 min-w-0">
         <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
          {emailName.charAt(0).toUpperCase()}
         </div>
         <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold truncate">{emailName}</span>
          <span className="text-[10px] font-medium text-slate-500 truncate">{displayAddress}</span>
         </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
       </Link>
      </div>
     </aside>

     {/* Main Content */}
     <main className="flex-1 flex flex-col min-w-0">
      
      {/* Top Header */}
      <header className="w-full flex items-center justify-between py-6 px-8 sm:px-10 lg:px-12 bg-[#FAFBFF] sticky top-0 z-30 backdrop-blur-md border-b border-slate-100/50">
       <div className="flex flex-col">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900">Assets</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Manage your tokens and trustlines</p>
       </div>
       <div className="hidden md:flex items-center gap-6">
        <div className="relative">
         <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
         <input type="text" placeholder="Search anything..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all w-64 shadow-sm" />
        </div>
        <button className="relative p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
         <Bell className="w-5 h-5 text-slate-600" />
         <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4">3</span>
        </button>
       </div>
      </header>

      <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6 pt-6">

       {/* Back to Dashboard */}
       <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
         <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
       </div>

       {/* My Assets — already activated */}
       <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
        <div className="flex items-center justify-between mb-6">
         <h3 className="font-extrabold text-slate-900 text-xl">My Assets</h3>
         <span className="text-xs font-bold text-slate-400">{balances.length} token{balances.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex flex-col gap-3">
         {balances.length > 0 ? balances.map((b: any, i: number) => {
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
           logoContent = <div className="w-full h-full bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px]">{code?.slice(0, 3)}</div>;
          }

          return (
           <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/30 border border-slate-100/60 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">
              {logoContent}
             </div>
             <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm">{code}</span>
              {b.asset_issuer && (
               <span className="text-[10px] font-mono text-slate-400">Issuer: {b.asset_issuer.slice(0, 8)}...</span>
              )}
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
           <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-slate-400" />
           </div>
           <span className="font-bold text-slate-500 text-sm">No assets found</span>
           <span className="text-xs text-slate-400 mt-1">Add a token below to get started.</span>
          </div>
         )}
        </div>
       </div>

       {/* Available Assets — available for activation */}
       <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
        <h3 className="font-extrabold text-slate-900 text-xl mb-6">Available Assets</h3>

        {error && (
         <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium p-4 rounded-xl mb-4">
          {error}
         </div>
        )}
        {success && (
         <div className="bg-green-50 border border-green-100 text-green-600 text-sm font-medium p-4 rounded-xl mb-4 flex items-center gap-2">
          <Check className="w-4 h-4" /> {success}
         </div>
        )}

        <div className="flex flex-col gap-3">
         {COMMON_ASSETS.map((asset) => {
          const alreadyAdded = existingCodes.includes(asset.code);
          const isLoading = addingAsset === asset.code;
          return (
           <div key={asset.code} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/30 border border-slate-100/60">
            <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">
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
              <span className="text-[11px] text-slate-500 font-medium">{asset.name}</span>
             </div>
            </div>
            {alreadyAdded ? (
             <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              <Check className="w-3.5 h-3.5" /> Active
             </span>
            ) : (
             <button
              onClick={() => handleAddAsset(asset.code, asset.issuer)}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-[0_2px_8px_rgba(79,70,229,0.25)]"
             >
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
           <input
            value={customCode}
            onChange={e => setCustomCode(e.target.value.toUpperCase())}
            placeholder="e.g. RANDOM"
            className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
           />
          </div>
          <div className="flex flex-col gap-1.5">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issuer Public Key</label>
           <input
            value={customIssuer}
            onChange={e => setCustomIssuer(e.target.value)}
            placeholder="G..."
            className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium font-mono focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
           />
          </div>
         </div>
         <button
          onClick={handleAddCustom}
          disabled={!!addingAsset || !customCode || !customIssuer}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
         >
          {addingAsset === "custom" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {addingAsset === "custom" ? "Adding..." : "Activate Custom Asset"}
         </button>
        </div>
       </div>

      </div>
     </main>
    </div>
  );
}
