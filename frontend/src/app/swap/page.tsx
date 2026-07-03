"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, swapTokens, getSwapEstimate, getBalances, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { ChevronDown, ArrowLeft, Loader2, ExternalLink, RefreshCw, CheckCircle2, ArrowRightLeft, Shield } from "lucide-react";
import logo from "../media/ateruslogo.jpeg";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import { getNavItems } from "@/constants/navigation";

const ALL_TOKENS = [
  { code: "XLM", issuer: null } as const,
  { code: "USDC", issuer: "GA2BYV7QJ75ZAZXQBEDX5CAYXIRMXELJYRK5O6IHF2RLCDKVQU2ZSKBU" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U" },
];
type Token = typeof ALL_TOKENS[number];

function tokenColor(token: Token): string {
  switch (token.code) { case "XLM": return "bg-black text-white"; case "USDC": return "bg-blue-500 text-white"; case "EURT": return "bg-emerald-500 text-white"; default: return "bg-slate-500 text-white"; }
}

export default function SwapPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [balances, setBalances] = useState<any[]>([]);
  const [fromToken, setFromToken] = useState<Token>(ALL_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(ALL_TOKENS[1]);
  const [status, setStatus] = useState<"idle" | "swapping" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [displayEstimate, setDisplayEstimate] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const activatedTokens = ALL_TOKENS.filter(t => t.code === "XLM" || balances.some(b => b.asset_code === t.code));
  const toOptions = activatedTokens.filter(t => t.code !== fromToken.code);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    getBalances(wallet.publicKey).then(bals => {
      setBalances(bals);
      const activatedCodes = bals.map((b: any) => b.asset_code).filter(Boolean);
      const firstNonNative = ALL_TOKENS.find(t => t.code !== "XLM" && activatedCodes.includes(t.code));
      if (firstNonNative) setToToken(firstNonNative);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Estimate
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || !storedWallet) { setDisplayEstimate(null); return; }
    const val = parseFloat(amount);
    const from = fromToken.code;
    const to = toToken.code;
    let fallback = val * 0.9;
    if (from === "XLM" && to === "USDC") fallback = val * 0.85;
    else if (from === "XLM" && to === "EURT") fallback = val * 0.72;
    else if (from === "USDC" && to === "XLM") fallback = val * 1.15;
    else if (from === "USDC" && to === "EURT") fallback = val * 0.84;
    else if (from === "EURT" && to === "XLM") fallback = val * 1.35;
    else if (from === "EURT" && to === "USDC") fallback = val * 1.18;
    setDisplayEstimate(fallback.toFixed(4));
    setEstimating(true);
    const timer = setTimeout(async () => {
      try { const est = await getSwapEstimate(fromToken.code === "XLM" ? null : fromToken.code, fromToken.code === "XLM" ? null : fromToken.issuer, toToken.code, toToken.issuer!, amount); if (parseFloat(est) > 0) setDisplayEstimate(est); }
      catch { /* fallback */ }
      finally { setEstimating(false); }
    }, 150);
    return () => { clearTimeout(timer); setEstimating(false); };
  }, [amount, fromToken, toToken, storedWallet]);

  const handleFromChange = (code: string) => {
    const newToken = ALL_TOKENS.find(t => t.code === code)!;
    setFromToken(newToken);
    if (newToken.code === toToken.code) { const available = activatedTokens.filter(t => t.code !== code); if (available.length > 0) setToToken(available[0]); }
  };

  const handleSwapDirection = () => { const temp = fromToken; setFromToken(toToken); setToToken(temp); };

  const handleSwap = async () => {
    const address = storedWallet?.publicKey || "";
    try {
      setStatus("swapping"); setErrorMsg("");
      if (!storedWallet) { router.push("/wallet"); return; }
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");
      let sourceBalance = fromToken.code === "XLM" ? (balances.find(b => b.asset_type === "native")?.balance || "0") : (balances.find(b => b.asset_code === fromToken.code)?.balance || "0");
      if (parseFloat(sourceBalance) < parseFloat(amount)) throw new Error(`Insufficient ${fromToken.code} balance`);
      const hash = await swapTokens(fromToken.code === "XLM" ? null : fromToken.code, fromToken.code === "XLM" ? null : fromToken.issuer, toToken.code, toToken.issuer!, amount);
      setTxHash(hash);
      const bals = await getBalances(address);
      setBalances(bals);
      setStatus("success");
    } catch (err: any) { setErrorMsg(err.message || "Swap failed"); setStatus("error"); }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = storedWallet?.publicKey ? `${storedWallet.publicKey.slice(0, 5)}...${storedWallet.publicKey.slice(-4)}` : '';
  const navItems = getNavItems("Swap");

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />
      <main className="flex-1 flex flex-col min-w-0">
        <AppHeader title="Swap" subtitle="Swap tokens on the Stellar DEX" onSearchOpen={() => setSearchOpen(true)} />

        <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6 pt-6">
          <div><Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link></div>

          {status === "success" ? (
            <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-6 border-4 border-green-100"><CheckCircle2 className="w-10 h-10" /></div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Swap Successful</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">Successfully swapped {fromToken.code} for {toToken.code}</p>
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-[0_4px_12px_rgba(79,70,229,0.3)]">Back to Dashboard</button>
                <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-colors inline-flex items-center gap-2">View Explorer <ExternalLink className="w-4 h-4" /></a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
                <h3 className="font-extrabold text-slate-900 text-xl mb-8">Swap Tokens</h3>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-8 p-5 sm:p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="w-full sm:flex-1 flex flex-col gap-1.5 sm:gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">From</span>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${tokenColor(fromToken)} flex items-center justify-center`}><span className="font-bold text-xs">{fromToken.code.slice(0, 2)}</span></div>
                      <div className="relative">
                        <select value={fromToken.code} onChange={e => handleFromChange(e.target.value)} className="font-extrabold text-lg text-slate-900 bg-transparent border-none outline-none cursor-pointer focus:text-indigo-600 appearance-none pr-5">
                          {activatedTokens.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <button onClick={handleSwapDirection} className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 rotate-90 sm:rotate-0 hover:bg-indigo-100 transition-colors cursor-pointer">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
                  </button>
                  <div className="w-full sm:flex-1 flex flex-col gap-1.5 sm:gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">To</span>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${tokenColor(toToken)} flex items-center justify-center`}><span className="font-bold text-xs">{toToken.code.slice(0, 2)}</span></div>
                      <div className="relative">
                        <select value={toToken.code} onChange={e => setToToken(ALL_TOKENS.find(t => t.code === e.target.value)!)} className="font-extrabold text-lg text-slate-900 bg-transparent border-none outline-none cursor-pointer focus:text-indigo-600 appearance-none pr-5">
                          {toOptions.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount ({fromToken.code})</label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number" step="0.01" className="w-full p-4 rounded-xl border border-slate-200 text-lg font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  {displayEstimate && parseFloat(displayEstimate) > 0 && (
                    <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-2">
                      <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">≈ You receive {estimating && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}</span>
                      <span className="text-lg font-extrabold text-indigo-700">{parseFloat(displayEstimate).toFixed(4)} {toToken.code}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-400 mb-6 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Swap via Stellar DEX. Rate determined at time of execution.</p>
                {status === "error" && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl mb-4">{errorMsg}</div>}
                <button onClick={handleSwap} disabled={status === "swapping" || !amount || parseFloat(amount) <= 0} className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-sm font-bold transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2">
                  {status === "swapping" ? <><Loader2 className="w-4 h-4 animate-spin" /> Swapping...</> : <>Swap {fromToken.code} for {toToken.code}</>}
                </button>
              </div>
              <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                  <svg className="absolute bottom-0 right-0 w-full h-[120px] opacity-40 mix-blend-overlay pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="M0 100 L0 70 Q10 80, 20 60 T40 50 T60 30 T80 40 T100 10 L100 100 Z" fill="rgba(255,255,255,0.1)" /></svg>
                  <h3 className="font-extrabold text-xl mb-2 relative z-10">Stellar DEX</h3>
                  <p className="text-indigo-100 text-sm font-medium mb-6 relative z-10 leading-relaxed">Swaps are executed directly on the Stellar decentralized exchange with competitive rates.</p>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 relative z-10 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-indigo-100">Fee</span><span className="text-sm font-bold text-white">~0.00001 XLM</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-indigo-100">Slippage</span><span className="text-sm font-bold text-white">5%</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100/50 flex gap-4 items-start">
                  <div className="w-10 h-10 shrink-0 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                  <div><h4 className="font-bold text-slate-900 text-sm mb-1">Rates may vary</h4><p className="text-xs text-slate-500 font-medium leading-relaxed">Swap rates are determined by the Stellar DEX orderbook at the time of execution.</p></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
      </main>
    </div>
  );
}
