"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, swapXLM, getBalance, getExplorerUrl } from "@/lib/wallet";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";

const TOKENS = [
  { code: "USDC", issuer: "GA2BYV7QJ75ZAZXQBEDX5CAYXIRMXELJYRK5O6IHF2RLCDKVQU2ZSKBU" },
  { code: "EURT", issuer: "GBLETQF7AAB2DPWP3LU6DYXYF3CZX7RVH3PB6IHQWECTOKZL7EENGO2U" },
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
      <div className="content-area inner-space">
        <Link href="/dashboard" className="back-link">
          <ArrowLeft className="icon-sm" /> Back to Wallet
        </Link>

        <h1 className="card-title">Swap XLM</h1>

        {status === "success" ? (
          <div className="card text-centered inner-space">
            <p className="success-banner">Swapped!</p>
            <p className="detail-text">XLM to {token.code}</p>
            <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-center-row">
              View on Explorer <ExternalLink className="icon-sm" />
            </a>
            <button onClick={() => router.push("/dashboard")} className="btn-primary">
              Back to Wallet
            </button>
          </div>
        ) : (
          <div className="card inner-space">
            <div className="swap-pair">
              <span className="card-title">XLM</span>
              <ArrowLeft className="icon-sm swap-pair-arrow" />
              <select value={token.code} onChange={e => setToken(TOKENS.find(t => t.code === e.target.value)!)} className="swap-select">
                {TOKENS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">Amount (XLM)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" type="number" step="0.01" className="input" />
            </div>

            <p className="detail-text">Swap via Stellar DEX. 2% slippage buffer.</p>

            {status === "error" && <div className="status-error">{errorMsg}</div>}

            <button onClick={handleSwap} disabled={status === "swapping"} className="btn-primary flex-center-row">
              {status === "swapping" ? <><Loader2 className="icon-sm icon-spin" /> Swapping...</> : `Swap to ${token.code}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
