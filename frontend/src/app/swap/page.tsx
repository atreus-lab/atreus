"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, swapXLM, getBalances, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { 
 LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
 Settings, Search, Bell, ChevronDown, ArrowLeft, Loader2, ExternalLink, RefreshCw, CheckCircle2
} from "lucide-react";
import logo from "../../media/ateruslogo.jpeg";

const ALL_TOKENS = [
  { code: "USDC", issuer: "GA2BYV7QJ75ZAZXQBEDX5CAYXIRMXELJYRK5O6IHF2RLCDKVQU2ZSKBU" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U" },
];

const navItems = [
 { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
 { icon: Wallet, label: "Wallet", href: "/wallet" },
 { icon: Link2, label: "Payment Links" },
 { icon: ArrowRightLeft, label: "Swap", active: true, href: "/swap" },
 { icon: BarChart3, label: "Analytics", href: "/analytics" },
 { icon: Activity, label: "Activity", href: "/activity" },
 { icon: Shield, label: "Security", href: "/security" },
 { icon: Settings, label: "Settings", href: "/settings" },
];

export default function SwapPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [balances, setBalances] = useState<any[]>([]);
  const [token, setToken] = useState(ALL_TOKENS[0]);
  const [status, setStatus] = useState<"idle" | "swapping" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const activatedTokens = ALL_TOKENS.filter(t => balances.some(b => b.asset_code === t.code));
  const swappableTokens = activatedTokens.length > 0 ? activatedTokens : ALL_TOKENS;

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    getBalances(wallet.publicKey).then(bals => {
      setBalances(bals);
      // Default to first activated token
      const activatedCodes = bals.map((b: any) => b.asset_code).filter(Boolean);
      const firstActivated = ALL_TOKENS.find(t => activatedCodes.includes(t.code));
      if (firstActivated) setToken(firstActivated);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const handleSwap = async () => {
    try {
      setStatus("swapping");
      setErrorMsg("");

      if (!storedWallet) { router.push("/wallet"); return; }
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");

      const xlmBal = balances.find(b => b.asset_type === "native")?.balance || "0";
      if (parseFloat(xlmBal) < parseFloat(amount) + 0.005) throw new Error("Insufficient XLM");

      const hash = await swapXLM(token.code, token.issuer, amount);
      setTxHash(hash);
      // Refresh balances after successful swap
      const bals = await getBalances(storedWallet.publicKey);
      setBalances(bals);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Swap failed");
      setStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = storedWallet?.publicKey ? `${storedWallet.publicKey.slice(0, 5)}...${storedWallet.publicKey.slice(-4)}` : '';

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
     
     {/* Sidebar */}
     <aside className="w-[280px] bg-white border-r border-slate-100 hidden lg:flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-20 overflow-hidden">
      <div className="px-6 pt-8 pb-4 shrink-0">
       <Link href="/" className="flex items-center gap-3 px-2 cursor-pointer hover:opacity-80 transition-opacity">
        <Image src={logo} alt="Atreus" width={32} height={32} className="rounded-[10px] shadow-sm" />
        <span className="font-extrabold text-xl tracking-tight text-slate-900">Atreus</span>
       </Link>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-1.5 py-2">
       {navItems.map((item, i) => {
        if (item.href) {
         return (
          <Link key={i} href={item.href} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
           <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
           {item.label}
          </Link>
         );
        }
        return (
         <div key={i} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
          <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
          {item.label}
         </div>
        );
       })}
      </nav>
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
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900">Swap</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Swap XLM for supported tokens on Stellar DEX</p>
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

       {status === "success" ? (
        /* Success State */
        <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col items-center text-center">
         <div className="w-20 h-20 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-6 border-4 border-green-100">
          <CheckCircle2 className="w-10 h-10" />
         </div>
         <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Swap Successful</h3>
         <p className="text-sm text-slate-500 font-medium mb-8">
          Successfully swapped XLM for {token.code}
         </p>
         <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
           Back to Dashboard
          </button>
          <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-colors inline-flex items-center gap-2">
           View Explorer <ExternalLink className="w-4 h-4" />
          </a>
         </div>
        </div>
       ) : (
        /* Swap Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Swap Card */}
         <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
          <h3 className="font-extrabold text-slate-900 text-xl mb-8">Swap XLM for Tokens</h3>

          {/* Swap Pair */}
          <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
           <div className="flex-1 flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">From</span>
            <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              <span className="text-white font-bold text-xs">XLM</span>
             </div>
             <span className="font-extrabold text-lg text-slate-900">XLM</span>
            </div>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
           </div>
           <div className="flex-1 flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">To</span>
            <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xs">{token.code.slice(0, 2)}</span>
             </div>
             <div className="relative">
              <select value={token.code} onChange={e => setToken(ALL_TOKENS.find(t => t.code === e.target.value)!)} className="font-extrabold text-lg text-slate-900 bg-transparent border-none outline-none cursor-pointer focus:text-indigo-600 appearance-none pr-5">
               {swappableTokens.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
            </div>
           </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2 mb-6">
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (XLM)</label>
           <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number" step="0.01" className="w-full p-4 rounded-xl border border-slate-200 text-lg font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
           {parseFloat(amount) > 0 && (
            <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-2">
             <span className="text-sm font-semibold text-slate-600">≈ You receive</span>
             <span className="text-lg font-extrabold text-indigo-700">
              {(parseFloat(amount) * 0.98).toFixed(2)} {token.code}
            </span>
            </div>
           )}
          </div>

          <p className="text-xs font-semibold text-slate-400 mb-6 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Swap via Stellar DEX. 2% slippage buffer.
          </p>

          {status === "error" && (
           <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl mb-4">
            {errorMsg}
           </div>
          )}

          <button onClick={handleSwap} disabled={status === "swapping" || !amount || parseFloat(amount) <= 0} className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-sm font-bold transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2">
           {status === "swapping" ? <><Loader2 className="w-4 h-4 animate-spin" /> Swapping...</> : <>Swap to {token.code}</>}
          </button>
         </div>

         {/* Info Card */}
         <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
           <svg className="absolute bottom-0 right-0 w-full h-[120px] opacity-40 mix-blend-overlay pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M0 100 L0 70 Q10 80, 20 60 T40 50 T60 30 T80 40 T100 10 L100 100 Z" fill="rgba(255,255,255,0.1)" />
           </svg>
           <h3 className="font-extrabold text-xl mb-2 relative z-10">Stellar DEX</h3>
           <p className="text-indigo-100 text-sm font-medium mb-6 relative z-10 leading-relaxed">
            Swaps are executed directly on the Stellar decentralized exchange with competitive rates.
           </p>
           <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 relative z-10 space-y-2">
            <div className="flex items-center justify-between">
             <span className="text-sm font-semibold text-indigo-100">Fee</span>
             <span className="text-sm font-bold text-white">~0.00001 XLM</span>
            </div>
            <div className="flex items-center justify-between">
             <span className="text-sm font-semibold text-indigo-100">Slippage</span>
             <span className="text-sm font-bold text-white">2%</span>
            </div>
           </div>
          </div>

          <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100/50 flex gap-4 items-start">
           <div className="w-10 h-10 shrink-0 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
            <Shield className="w-5 h-5" />
           </div>
           <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Rates may vary</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Swap rates are determined by the Stellar DEX orderbook at the time of execution.</p>
           </div>
          </div>
         </div>

        </div>
       )}

      </div>
     </main>
    </div>
  );
}
