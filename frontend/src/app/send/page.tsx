"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, sendXLM, getBalance, getExplorerUrl } from "@/lib/wallet";
import { Loader2, ExternalLink, ArrowLeft } from "lucide-react";

export default function SendPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSend = async () => {
    try {
      setStatus("sending");
      setErrorMsg("");

      const wallet = loadWallet();
      if (!wallet) { router.push("/wallet"); return; }
      if (!destination.trim()) throw new Error("Enter a destination address");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");

      const bal = await getBalance(wallet.publicKey);
      if (parseFloat(bal) < parseFloat(amount) + 0.001) throw new Error("Insufficient balance");

      const hash = await sendXLM(destination.trim(), amount);
      setTxHash(hash);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Send failed");
      setStatus("error");
    }
  };

  return (
    <div className="page">
      <div className="content-area inner-space">
        <Link href="/dashboard" className="back-link">
          <ArrowLeft className="icon-sm" /> Back to Wallet
        </Link>

        <h1 className="card-title">Send XLM</h1>

        {status === "success" ? (
          <div className="card text-centered inner-space">
            <p className="success-banner">Sent!</p>
            <p className="detail-text">{amount} XLM sent successfully</p>
            <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-center-row">
              View on Explorer <ExternalLink className="icon-sm" />
            </a>
            <button onClick={() => router.push("/dashboard")} className="btn-primary">
              Back to Wallet
            </button>
          </div>
        ) : (
          <div className="card inner-space">
            <div>
              <label className="input-label">Destination Address</label>
              <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="G..." className="input" />
            </div>
            <div>
              <label className="input-label">Amount (XLM)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" type="number" step="0.0000001" className="input" />
            </div>
            {status === "error" && <div className="status-error">{errorMsg}</div>}
            <button onClick={handleSend} disabled={status === "sending"} className="btn-primary flex-center-row">
              {status === "sending" ? <><Loader2 className="icon-sm icon-spin" /> Sending...</> : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
