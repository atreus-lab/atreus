"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, sendXLM, getNativeBalance, getStellarExpertUrl } from "@/lib/stellar";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SendPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSend = async () => {
    try {
      setStatus("connecting");
      setErrorMsg("");

      const sender = await connectWallet();

      if (!destination.trim()) throw new Error("Enter a destination address");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");

      const balance = await getNativeBalance(sender);
      if (parseFloat(balance) < parseFloat(amount) + 0.001) throw new Error("Insufficient balance");

      setStatus("sending");
      const hash = await sendXLM(sender, destination.trim(), amount);
      setTxHash(hash);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Send failed");
      setStatus("error");
    }
  };

  return (
    <div className="page">
      <div className="w-full max-w-md space-y-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] transition">
          <ArrowLeft className="w-4 h-4" /> Back to Wallet
        </Link>

        <h1 className="card-title">Send XLM</h1>

        {status === "success" ? (
          <div className="card text-centered space-y-4">
            <div className="text-[var(--success)] text-lg font-bold">Sent!</div>
            <p className="text-sm text-[var(--foreground-secondary)]">
              {amount} XLM sent successfully
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
            <div>
              <label className="input-label">Destination Address</label>
              <input
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="G... or friendbot"
                className="input"
                disabled={status === "sending"}
              />
            </div>

            <div>
              <label className="input-label">Amount (XLM)</label>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.0"
                type="number"
                step="0.0000001"
                className="input"
                disabled={status === "sending"}
              />
            </div>

            {status === "error" && (
              <div className="status-error text-sm">{errorMsg}</div>
            )}

            <button
              onClick={handleSend}
              disabled={status === "sending" || status === "connecting"}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {status === "connecting" && <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>}
              {status === "sending" && <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>}
              {status === "idle" && "Send"}
              {status === "error" && "Try Again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
