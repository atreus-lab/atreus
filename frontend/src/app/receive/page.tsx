"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadWallet, getExplorerUrl } from "@/lib/wallet";
import { ArrowLeft, Copy, Check, Loader2 } from "lucide-react";

export default function ReceivePage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const wallet = loadWallet();
    if (wallet) setAddress(wallet.publicKey);
    setLoading(false);
  }, []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="page">
      <div className="w-full max-w-md space-y-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] transition">
          <ArrowLeft className="w-4 h-4" /> Back to Wallet
        </Link>

        <h1 className="card-title">Receive XLM</h1>

        {loading ? (
          <div className="card text-centered"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : !address ? (
          <div className="card text-centered">
            <p className="card-body">No wallet found.</p>
            <Link href="/wallet" className="btn-primary mt-4 inline-block">Create Wallet</Link>
          </div>
        ) : (
          <div className="card space-y-6">
            <p className="card-body">Share your Stellar address to receive funds:</p>
            <div className="status-badge">
              <p className="text-xs break-all font-mono">{address}</p>
            </div>
            <button onClick={copyAddress} className="btn-primary flex items-center justify-center gap-2">
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Address</>}
            </button>
            <a href={getExplorerUrl("account", address)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]">
              View on Stellar Expert
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
