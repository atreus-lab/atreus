"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, swapXLM, getNativeBalance, getStellarExpertUrl } from "@/lib/stellar";
import { Asset } from "@stellar/stellar-sdk";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

const SWAP_OPTIONS = [
  { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NOZ4RYD6UJPAF3K" },
  { code: "EURT", issuer: "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S" },
];

export default function SwapPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(SWAP_OPTIONS[0]);
  const [status, setStatus] = useState<"idle" | "connecting" | "swapping" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSwap = async () => {
    try {
      setStatus("connecting");
      setErrorMsg("");

      const sender = await connectWallet();
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");

      const balance = await getNativeBalance(sender);
      if (parseFloat(balance) < parseFloat(amount) + 0.005) throw new Error("Insufficient XLM balance");

      const destAsset = new Asset(selectedAsset.code, selectedAsset.issuer);

      setStatus("swapping");
      const hash = await swapXLM(sender, destAsset, amount);
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
            <p className="text-sm text-[var(--foreground-secondary)]">
              XLM to {selectedAsset.code} via Stellar DEX
            </p>
            <a
              href={getStellarExpertUrl("tx", txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center gap-2"
            >
              View on Explorer <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={() => router.push("/dashboard")} className="btn-primary mt-4">
              Back to Wallet
            </button>
          </div>
        ) : (
          <div className="card space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--background-primary)]">
              <span className="font-bold">XLM</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--foreground-secondary)]" />
              <select
                value={selectedAsset.code}
                onChange={e => setSelectedAsset(SWAP_OPTIONS.find(o => o.code === e.target.value)!)}
                className="bg-transparent font-bold outline-none"
                disabled={status === "swapping"}
              >
                {SWAP_OPTIONS.map(o => (
                  <option key={o.code} value={o.code}>{o.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Amount to swap (XLM)</label>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0"
                type="number"
                step="0.01"
                className="input"
                disabled={status === "swapping"}
              />
            </div>

            <p className="text-xs text-[var(--foreground-secondary)]">
              Swap via Stellar DEX. Slippage: 2%. Liquidity depends on available paths.
            </p>

            {status === "error" && (
              <div className="status-error text-sm">{errorMsg}</div>
            )}

            <button
              onClick={handleSwap}
              disabled={status === "swapping" || status === "connecting"}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {status === "connecting" && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>}
              {status === "swapping" && <><Loader2 className="w-4 h-4 animate-spin" /> Swapping...</>}
              {status === "idle" && `Swap XLM to ${selectedAsset.code}`}
              {status === "error" && "Try Again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
