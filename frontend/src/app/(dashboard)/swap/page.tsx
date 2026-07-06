"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, swapTokens, getSwapEstimate, getBalances, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { ChevronDown, Loader2, ExternalLink, RefreshCw, CheckCircle2, ArrowRightLeft, Shield } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

const ALL_TOKENS = [
  { code: "XLM", issuer: null } as const,
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U" },
];
type Token = typeof ALL_TOKENS[number];

function tokenBadge(code: string) {
  const colors: Record<string, string> = { XLM: 'bg-black text-white', USDC: 'bg-blue-600 text-white', EURT: 'bg-emerald-600 text-white' };
  return colors[code] || 'bg-elevated text-secondary';
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

  const activatedTokens = useMemo(() => ALL_TOKENS.filter(t => t.code === "XLM" || balances.some(b => b.asset_code === t.code && (t.issuer === null || b.asset_issuer === t.issuer))), [balances]);
  const toOptions = useMemo(() => activatedTokens.filter(t => t.code !== fromToken.code), [activatedTokens, fromToken.code]);

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

  const estimateCache = useRef(new Map<string, { estimate: string; timestamp: number }>());
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0 || !storedWallet) { setDisplayEstimate(null); return; }
    setDisplayEstimate(null);

    const cacheKey = `${fromToken.code}:${fromToken.issuer}:${toToken.code}:${toToken.issuer}:${amount}`;
    const cached = estimateCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10000) {
      setDisplayEstimate(cached.estimate);
      return;
    }

    setEstimating(true);

    const timer = setTimeout(async () => {
      cancelRef.current = false;
      const cancelled = () => cancelRef.current;
      try {
        const est = await getSwapEstimate(fromToken.code === "XLM" ? null : fromToken.code, fromToken.code === "XLM" ? null : fromToken.issuer, toToken.code, toToken.issuer!, amount);
        if (cancelled()) return;
        if (parseFloat(est) > 0) {
          setDisplayEstimate(est);
          estimateCache.current.set(cacheKey, { estimate: est, timestamp: Date.now() });
        }
      } catch {
        /* fallback */
      } finally {
        if (!cancelled()) setEstimating(false);
      }
    }, 500);

    return () => { clearTimeout(timer); cancelRef.current = true; setEstimating(false); };
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
      const sourceBalance = fromToken.code === "XLM" ? (balances.find(b => b.asset_type === "native")?.balance || "0") : (balances.find(b => b.asset_code === fromToken.code)?.balance || "0");
      if (parseFloat(sourceBalance) < parseFloat(amount)) throw new Error(`Insufficient ${fromToken.code} balance`);
      const hash = await swapTokens(fromToken.code === "XLM" ? null : fromToken.code, fromToken.code === "XLM" ? null : fromToken.issuer, toToken.code, toToken.issuer!, amount);
      setTxHash(hash);
      const bals = await getBalances(address);
      setBalances(bals);
      setStatus("success");
    } catch (err: any) { setErrorMsg(err.message || "Swap failed"); setStatus("error"); }
  };

  return (
    <>
      <AppHeader title="Swap" subtitle="Swap tokens on the Stellar DEX" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />

      <div className="app-content flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : status === "success" ? (
          <div className="panel p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-[rgba(34,197,94,0.1)] text-success">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-primary">Swap Successful</h3>
            <p className="text-sm text-secondary mb-8">Successfully swapped {fromToken.code} for {toToken.code}</p>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/dashboard")} className="btn-primary px-6 py-2.5 rounded-lg text-sm font-bold">Back to Dashboard</button>
              <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-lg text-sm font-bold bg-elevated text-primary border border-[var(--border-default)] inline-flex items-center gap-2 transition-colors">View Explorer <ExternalLink className="w-4 h-4" /></a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="panel lg:col-span-2 p-8 flex flex-col">
              <h3 className="section-title mb-6" style={{ fontSize: '1.25rem' }}>Swap Tokens</h3>
              
              {/* Token pair selector */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 p-4 rounded-xl bg-elevated border border-[var(--border-default)]">
                <div className="w-full sm:flex-1 flex flex-col gap-1">
                  <span className="section-label">From</span>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${tokenBadge(fromToken.code)} flex items-center justify-center`}><span className="font-bold text-[10px]">{fromToken.code.slice(0, 2)}</span></div>
                    <div className="relative">
                      <select value={fromToken.code} onChange={e => handleFromChange(e.target.value)} className="font-bold text-base bg-transparent border-none outline-none cursor-pointer appearance-none pr-5 text-primary">
                        {activatedTokens.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
                    </div>
                  </div>
                </div>
                <button onClick={handleSwapDirection} className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 rotate-90 sm:rotate-0 bg-[rgba(59,130,246,0.08)] text-accent border border-[rgba(59,130,246,0.15)] transition-colors hover:bg-[rgba(59,130,246,0.12)]">
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <div className="w-full sm:flex-1 flex flex-col gap-1">
                  <span className="section-label">To</span>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${tokenBadge(toToken.code)} flex items-center justify-center`}><span className="font-bold text-[10px]">{toToken.code.slice(0, 2)}</span></div>
                    <div className="relative">
                      <select value={toToken.code} onChange={e => setToToken(ALL_TOKENS.find(t => t.code === e.target.value)!)} className="font-bold text-base bg-transparent border-none outline-none cursor-pointer appearance-none pr-5 text-primary">
                        {toOptions.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-secondary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div className="flex flex-col gap-1.5 mb-4">
                <label className="section-label">Amount ({fromToken.code})</label>
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number" step="0.01" className="input text-lg font-bold" />
                {displayEstimate && parseFloat(displayEstimate) > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg mt-2 bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.1)]">
                    <span className="text-sm text-secondary flex items-center gap-2">≈ You receive {estimating && <Loader2 className="w-3 h-3 animate-spin text-secondary" />}</span>
                    <span className="text-base font-bold text-accent">{parseFloat(displayEstimate).toFixed(4)} {toToken.code}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-secondary mb-4 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Swap via Stellar DEX. Rate determined at time of execution.</p>

              {status === "error" && (
                <div className="p-3 text-sm font-semibold rounded-lg mb-4 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-error">{errorMsg}</div>
              )}

              <button onClick={handleSwap} disabled={status === "swapping" || !amount || parseFloat(amount) <= 0} className="btn-primary w-full py-3.5 rounded-lg font-bold text-base flex items-center justify-center gap-2">
                {status === "swapping" ? <><Loader2 className="w-4 h-4 animate-spin" /> Swapping...</> : <>Swap {fromToken.code} for {toToken.code}</>}
              </button>
            </div>

            {/* Info panel — flat, no gradient */}
            <div className="flex flex-col gap-6">
              <div className="panel p-6">
                <h3 className="font-bold text-base mb-2 text-primary">Stellar DEX</h3>
                <p className="text-sm text-secondary mb-4 leading-relaxed">Swaps are executed directly on the Stellar decentralized exchange with competitive rates.</p>
                <div className="flex flex-col gap-2 p-3 rounded-lg bg-elevated">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary">Fee</span>
                    <span className="text-sm font-bold text-primary">~0.00001 XLM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary">Slippage</span>
                    <span className="text-sm font-bold text-primary">5%</span>
                  </div>
                </div>
              </div>

              <div className="panel p-6">
                <div className="w-10 h-10 flex items-center justify-center mb-3 rounded-lg bg-[rgba(245,158,11,0.1)] text-amber-500">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base mb-1 text-primary">Rates may vary</h3>
                <p className="text-sm text-secondary leading-relaxed">Swap rates are determined by the Stellar DEX orderbook at the time of execution.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}
