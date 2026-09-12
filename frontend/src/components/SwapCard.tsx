"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronDown, ArrowUpDown, ChevronRight, Settings, Check, Loader2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { swapTokens, getSwapEstimate, getBalances, getExplorerUrl } from "@/lib/wallet";

const ALL_TOKENS = [
  { code: "XLM", issuer: null as string | null },
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U" },
] as const;
type Token = (typeof ALL_TOKENS)[number];

const EST_CACHE_KEY = "atreus_swap_estimates";
const EST_CACHE_TTL = 30_000;

function readEstimateCache(): Record<string, { estimate: string; timestamp: number }> {
  try {
    return JSON.parse(localStorage.getItem(EST_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function TokenLogo({ code, size = 24 }: { code: string; size?: number }) {
  if (code === "XLM") {
    return <Image src="/media/stellarlogo.webp" alt="XLM" width={size} height={size} className="rounded-full" />;
  }
  if (code === "USDC") {
    return <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" width={size} height={size} className="rounded-full" />;
  }
  return <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-accent">€</div>;
}

interface SwapCardProps {
  publicKey: string;
  balances?: any[];
  showBack?: boolean;
  onBack?: () => void;
}

export default function SwapCard({ publicKey, balances, showBack, onBack }: SwapCardProps) {
  const router = useRouter();
  const [bals, setBals] = useState<any[]>(balances ?? []);
  const [fromToken, setFromToken] = useState<Token>(ALL_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(ALL_TOKENS[1]);
  const [amount, setAmount] = useState("");
  const [openMenu, setOpenMenu] = useState<"from" | "to" | null>(null);
  const [status, setStatus] = useState<"idle" | "swapping" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [displayEstimate, setDisplayEstimate] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (balances) { setBals(balances); return; }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    getBalances(publicKey).then(setBals).catch(() => {});
  }, [publicKey, balances]);

  const activatedTokens = useMemo(
    () => ALL_TOKENS.filter(t => t.code === "XLM" || bals.some(b => b.asset_code === t.code && (t.issuer === null || b.asset_issuer === t.issuer))),
    [bals]
  );
  const toOptions = useMemo(() => activatedTokens.filter(t => t.code !== fromToken.code), [activatedTokens, fromToken.code]);

  const balanceOf = useCallback((code: string) => {
    if (code === "XLM") return bals.find((b: any) => b.asset_type === "native")?.balance || "0";
    return bals.find((b: any) => b.asset_code === code)?.balance || "0";
  }, [bals]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) { setDisplayEstimate(null); return; }
    setDisplayEstimate(null);

    const cacheKey = `${fromToken.code}:${toToken.code}:${amount}`;
    const cached = readEstimateCache()[cacheKey];
    if (cached && Date.now() - cached.timestamp < EST_CACHE_TTL) {
      setDisplayEstimate(cached.estimate);
      return;
    }

    setEstimating(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const est = await getSwapEstimate(
          fromToken.code === "XLM" ? null : fromToken.code,
          fromToken.code === "XLM" ? null : fromToken.issuer,
          toToken.code,
          toToken.issuer!,
          amount
        );
        if (cancelled) return;
        if (parseFloat(est) > 0) {
          setDisplayEstimate(est);
          const cache = readEstimateCache();
          cache[cacheKey] = { estimate: est, timestamp: Date.now() };
          try { localStorage.setItem(EST_CACHE_KEY, JSON.stringify(cache)); } catch {}
        }
      } catch {
        /* fallback */
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 200);

    return () => { cancelled = true; clearTimeout(timer); setEstimating(false); };
  }, [amount, fromToken, toToken]);

  const handleSelectFrom = (t: Token) => {
    setFromToken(t);
    if (t.code === toToken.code) {
      const others = activatedTokens.filter(x => x.code !== t.code);
      if (others.length > 0) setToToken(others[0]);
    }
    setOpenMenu(null);
  };

  const handleSelectTo = (t: Token) => { setToToken(t); setOpenMenu(null); };

  const handleSwapDirection = () => { const temp = fromToken; setFromToken(toToken); setToToken(temp); };

  const handleSwap = async () => {
    try {
      setStatus("swapping"); setErrorMsg("");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");
      const sourceBalance = balanceOf(fromToken.code);
      if (parseFloat(sourceBalance) < parseFloat(amount)) throw new Error(`Insufficient ${fromToken.code} balance`);
      const hash = await swapTokens(
        fromToken.code === "XLM" ? null : fromToken.code,
        fromToken.code === "XLM" ? null : fromToken.issuer,
        toToken.code,
        toToken.issuer!,
        amount
      );
      setTxHash(hash);
      const fresh = await getBalances(publicKey);
      setBals(fresh);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Swap failed");
      setStatus("error");
    }
  };

  const tokenChip = (token: Token, menu: "from" | "to", open: boolean) => (
    <button
      onClick={() => setOpenMenu(open ? null : menu)}
      className="relative mb-1 flex h-9 w-auto cursor-pointer items-center justify-center rounded-lg border border-grey-50 bg-grey-50 py-0 pl-3 pr-6 hover:bg-grey-100 active:bg-grey-50 mobile:mb-1 mobile:h-11 mobile:py-2"
    >
      <span className="mr-2 flex items-center space-x-1">
        <TokenLogo code={token.code} />
        <span className="line-clamp-1 text-[13px] font-semibold text-grey-900">{token.code}</span>
      </span>
      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey-600" />
    </button>
  );

  const tokenDropdown = (menu: "from" | "to") => (
    <div className="absolute left-0 z-20 mt-2 w-56 min-w-[200px] overflow-y-auto rounded-md bg-white text-left shadow-lg ring-1 ring-black/5">
      {(menu === "from" ? activatedTokens : toOptions).map(t => (
        <button
          key={t.code}
          onClick={() => (menu === "from" ? handleSelectFrom(t) : handleSelectTo(t))}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-grey-800 hover:bg-grey-50"
        >
          <TokenLogo code={t.code} /> {t.code}
          <span className="ml-auto text-xs font-normal text-grey-400">{parseFloat(balanceOf(t.code)).toFixed(2)}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="text-center">
      {status === "success" ? (
        <div className="flex flex-col items-center py-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success text-white shadow-[0_8px_24px_rgba(22,163,74,0.25)]">
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-grey-800">Swap Successful</h3>
          <p className="mb-8 text-sm text-grey-500">Successfully swapped {fromToken.code} for {toToken.code}</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setStatus("idle")} className="flex h-11 items-center gap-2 rounded-lg bg-primaryBlue px-4 font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700">Swap Again</button>
            <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center gap-2 rounded-lg border border-[#E0E7EB] px-4 font-medium text-grey-700 transition-colors hover:bg-grey-50">View Explorer <ExternalLink className="h-4 w-4" /></a>
          </div>
        </div>
      ) : (
        <>
          {showBack && (onBack ? (
            <button onClick={onBack} className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <Link href="/dashboard" className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          ))}

          <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">
            <div className="flex w-full flex-row justify-between">
              <div className="min-w-fit">Swap Tokens</div>
              <div className="flex flex-row items-center justify-end">
                <p className="mr-1 min-w-fit self-center text-[10px] font-normal text-grey-600">Powered by</p>
                <Image src="/media/stellarlogo.webp" alt="Stellar" width={20} height={20} className="h-4 w-4 rounded-full" />
              </div>
            </div>
          </h4>

          <div className="relative">
            {/* You Pay */}
            <div className="flex w-full rounded-t-lg border border-grey-100 bg-white px-5 pb-5 pt-4">
              <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-col items-start whitespace-nowrap">
                  <p className="text-xs font-semibold text-grey-800 mobile:mb-2">You Pay:</p>
                  <div className="relative">
                    {tokenChip(fromToken, "from", openMenu === "from")}
                    {openMenu === "from" && tokenDropdown("from")}
                  </div>
                  <div className="mt-1 inline-flex gap-1 text-xs text-grey-400 mobile:mt-2">
                    <span>Current Balance: </span>
                    <span className="font-bold">{parseFloat(balanceOf(fromToken.code)).toFixed(2)} {fromToken.code}</span>
                  </div>
                </div>
                <div className="ml-2 flex grow flex-col items-end">
                  <input
                    inputMode="decimal"
                    pattern="[0-9]*"
                    type="text"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border-none bg-white text-end font-light outline-none text-5xl text-grey-900"
                  />
                  <div className="mt-1">
                    <button
                      onClick={() => setAmount(balanceOf(fromToken.code))}
                      className="my-0 flex h-5 min-h-5 w-10 min-w-10 cursor-pointer select-none items-center justify-center rounded-xl bg-grey-50 py-2 text-[11px] font-semibold text-grey-600 hover:bg-grey-100 active:bg-grey-200"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap direction */}
            <button
              onClick={handleSwapDirection}
              aria-label="Swap direction"
              className="no-tap-highlight absolute inset-x-0 bottom-[-18px] z-50 mx-auto flex h-9 w-9 flex-shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-grey-100 bg-white transition-all hover:bg-grey-50"
            >
              <ArrowUpDown className="h-4 w-4 text-grey-400 transition duration-150 ease-linear" />
            </button>

            {/* You Receive */}
            <div className="flex w-full rounded-b-lg border border-grey-100 border-t-0 bg-white px-5 pb-3 pt-4">
              <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-col items-start whitespace-nowrap">
                  <p className="text-xs font-semibold text-grey-800 mobile:mb-2">You Receive:</p>
                  <div className="relative">
                    {tokenChip(toToken, "to", openMenu === "to")}
                    {openMenu === "to" && tokenDropdown("to")}
                  </div>
                  <div className="mt-1 inline-flex gap-1 text-xs text-grey-400 mobile:mt-2">
                    <span>Current Balance: </span>
                    <span className="font-bold">{parseFloat(balanceOf(toToken.code)).toFixed(2)} {toToken.code}</span>
                  </div>
                </div>
                <div className="ml-2 flex grow flex-col items-end">
                  <input
                    readOnly
                    type="text"
                    value={displayEstimate ? `~ ${parseFloat(displayEstimate).toFixed(4)}` : ""}
                    placeholder="0"
                    className="w-full border-none bg-white text-end font-light outline-none text-5xl text-grey-900"
                  />
                  <div className="mt-1 flex h-5 items-center justify-end">
                    {estimating && <Loader2 className="h-4 w-4 animate-spin text-grey-400" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-between pt-2">
            <button onClick={() => setShowDetails(!showDetails)} className="flex cursor-pointer select-none flex-row items-center text-grey-700 hover:opacity-80">
              <ChevronRight className={`h-4 w-4 transition ${showDetails ? "rotate-90" : ""}`} />
              <span className="ml-1 text-xs font-semibold">View Swap Details</span>
            </button>
            <div className="flex min-w-max cursor-pointer flex-row items-center self-center text-grey-700 hover:opacity-80">
              <Settings className="mr-1 h-4 w-4" />
              <span className="text-xs font-semibold">Settings</span>
            </div>
          </div>

          {showDetails && (
            <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-grey-50 p-3 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-grey-600">Fee</span>
                <span className="font-bold text-grey-800">~0.00001 XLM</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-grey-600">Slippage</span>
                <span className="font-bold text-grey-800">5%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-grey-600">Network</span>
                <span className="font-bold text-grey-800">Stellar DEX</span>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="mt-4 rounded-lg border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.08)] p-3 text-sm font-semibold text-error">{errorMsg}</div>
          )}

          <div className="mt-6 flex flex-col-reverse justify-between mobile:flex-row">
            <button onClick={() => (onBack ? onBack() : router.push("/dashboard"))} className="h-11 rounded-lg border border-[#E0E7EB] px-3 text-sm font-medium text-grey-700 hover:bg-grey-50 mobile:text-base">
              Cancel
            </button>
            <div className="flex w-full flex-row justify-end mobile:w-auto">
              <button
                onClick={handleSwap}
                disabled={status === "swapping" || !amount || parseFloat(amount) <= 0}
                className="flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-primaryBlue px-3 font-bold text-white transition duration-150 ease-out hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 mobile:w-[175px]"
              >
                {status === "swapping" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {status === "swapping" ? "Swapping..." : "Confirm & Swap"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}