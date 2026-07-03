"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { ArrowDownLeft, Copy, CheckCircle2, ShieldCheck } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

export default function ReceivePage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const copyToClipboard = async () => {
    if (storedWallet?.publicKey) {
      await navigator.clipboard.writeText(storedWallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <AppHeader title="Receive Assets" subtitle="Scan the QR code or share your public address" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />

      <div className="app-content max-w-4xl mx-auto">
        {!mounted ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* QR Code Card */}
          <div className="panel flex flex-col items-center text-center p-8">
            <div className="mb-6 p-4 rounded-xl bg-elevated border border-[var(--border-default)]">
              <div className="p-3 rounded-lg" style={{ background: 'white' }}>
                {storedWallet?.publicKey && (
                  <QRCode value={storedWallet.publicKey} size={200} level="Q" fgColor="#0f172a" />
                )}
              </div>
            </div>
            <h2 className="text-base font-bold mb-1 text-primary">Scan to Receive</h2>
            <p className="text-sm text-secondary max-w-xs">Ask the sender to scan this QR code with their wallet to send assets to you.</p>
          </div>

          {/* Address Info */}
          <div className="flex flex-col gap-6">
            <div className="panel flex flex-col p-8">
              <div className="w-10 h-10 flex items-center justify-center mb-4 rounded-lg bg-[rgba(59,130,246,0.08)] text-accent">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              
              <h3 className="text-base font-bold mb-1 text-primary">Your Public Address</h3>
              <p className="text-sm text-secondary mb-4">Share this address to receive payments on the Stellar network.</p>

              <div className="p-3 rounded-lg bg-elevated border border-[var(--border-default)] mb-4">
                <p className="font-mono text-sm break-all leading-relaxed font-bold text-primary">
                  {storedWallet?.publicKey}
                </p>
              </div>

              <button 
                onClick={copyToClipboard}
                className={`btn-primary w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${copied ? 'bg-emerald-600' : ''}`}
              >
                {copied ? (
                  <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Address</>
                )}
              </button>
            </div>

            {/* Network Warning */}
            <div className="panel p-6">
              <div className="w-10 h-10 flex items-center justify-center mb-3 rounded-lg bg-[rgba(245,158,11,0.1)] text-amber-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1 text-primary">Stellar Network Only</h3>
              <p className="text-sm text-secondary leading-relaxed">Ensure the sender is sending XLM or supported assets on the Stellar network. Sending from other networks may result in permanent loss.</p>
            </div>
          </div>
        </div>
        )}
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
