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
      <div className="content-area inner-space">
        <Link href="/dashboard" className="back-link">
          <ArrowLeft className="icon-sm" /> Back to Wallet
        </Link>

        <h1 className="card-title">Receive XLM</h1>

        {loading ? (
          <div className="card text-centered"><Loader2 className="icon-md icon-spin" /></div>
        ) : !address ? (
          <div className="card text-centered inner-space">
            <p className="card-body">No wallet found.</p>
            <Link href="/wallet" className="btn-primary inline-link">Create Wallet</Link>
          </div>
        ) : (
          <div className="card inner-space">
            <p className="card-body">Share your Stellar address to receive funds:</p>
            <div className="status-badge">
              <p className="mono-text">{address}</p>
            </div>
            <button onClick={copyAddress} className="btn-primary flex-center-row">
              {copied ? <><Check className="icon-sm" /> Copied!</> : <><Copy className="icon-sm" /> Copy Address</>}
            </button>
            <a href={getExplorerUrl("account", address)} target="_blank" rel="noopener noreferrer" className="link-primary flex-center-row">
              View on Stellar Expert
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
