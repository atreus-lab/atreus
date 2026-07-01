"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, swapXLM, getBalance, getExplorerUrl } from "@/lib/wallet";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";

const TOKENS = [
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NOZ4RYD6UJPAF3K" },
  { code: "EURT", issuer: "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S" },
];

export default function SwapPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState(TOKENS[0]);
  const [status, setStatus] = useState<"idle" | "swapping" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSwap = async () => {
    try {
      setStatus("swapping");
      setErrorMsg("");

      const wallet = loadWallet();
      if (!wallet) { router.push("/wallet"); return; }
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");

      const bal = await getBalance(wallet.publicKey);
      if (parseFloat(bal) < parseFloat(amount) + 0.005) throw new Error("Insufficient XLM");

      const hash = await swapXLM(token.code, token.issuer, amount);
      setTxHash(hash);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Swap failed");
      setStatus("error");
    }
  };

  return (
    <div className="page">
      <div className="w-full max-w-md space-y-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] transition">
          <ArrowLeft className="w-4 h-4" /> Back to Wallet
        </Link>

        <h1 className="card-title">Swap XLM</h1>

        {status === "success" ? (
          <div className="card text-centered space-y-4">
            <div className="text-[var(--success)] text-lg font-bold">Swapped!</div>
            <p className="text-sm text-[var(--foreground-secondary)]">XLM to {token.code}</p>
            <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
              View on Explorer <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={() => router.push("/dashboard")} className="btn-primary mt-4">Back to Wallet</button>
          </div>
        ) : (
          <div className="card space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--background-primary)]">
              <span className="font-bold">XLM</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--foreground-secondary)]" />
              <select value={token.code} onChange={e => setToken(TOKENS.find(t => t.code === e.target.value)!)} className="bg-transparent font-bold outline-none">
                {TOKENS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">Amount (XLM)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" type="number" step="0.01" className="input" />
            </div>

            <p className="text-xs text-[var(--foreground-secondary)]">Swap via Stellar DEX. 2% slippage buffer.</p>

            {status === "error" && <div className="status-error text-sm">{errorMsg}</div>}

            <button onClick={handleSwap} disabled={status === "swapping"} className="btn-primary flex items-center justify-center gap-2">
              {status === "swapping" ? <><Loader2 className="w-4 h-4 animate-spin" /> Swapping...</> : status === "error" ? "Try Again" : `Swap to ${token.code}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
