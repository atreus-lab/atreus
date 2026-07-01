"use client";

import { useEffect, useState } from "react";
import { connectWallet, getStellarExpertUrl } from "@/lib/stellar";
import { Loader2, Copy, Check, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function ReceivePage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const addr = await connectWallet();
        setAddress(addr);
      } catch (err: any) {
        setError(err.message || "Failed to connect");
      } finally {
        setLoading(false);
      }
    };
    load();
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
          <div className="card text-centered">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : error ? (
          <div className="card text-centered">
            <p className="status-error">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : (
          <div className="card space-y-6">
            <p className="card-body">
              Share your Stellar address to receive XLM and tokens:
            </p>

            <div className="status-badge">
              <p className="text-xs break-all font-mono">{address}</p>
            </div>

            <button onClick={copyAddress} className="btn-primary flex items-center justify-center gap-2">
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Address</>}
            </button>

            <a
              href={getStellarExpertUrl("account", address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]"
            >
              View on Stellar Expert <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
