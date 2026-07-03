"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { 
  ArrowDownLeft, Copy, CheckCircle2, ShieldCheck
} from "lucide-react";
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
    if (!wallet) {
      router.push("/wallet");
      return;
    }
    setStoredWallet(wallet);
  }, [router]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
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

  if (!mounted) {
   return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
     <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
   );
  }

  return (
    <>
      <AppHeader title="Receive Assets" subtitle="Scan the QR code or share your public address" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />

      <div className="app-content max-w-5xl mx-auto flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          
          {/* Left: QR Code Card */}
          <div className="panel flex flex-col items-center text-center relative overflow-hidden group p-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: 'rgba(59,130,246,0.1)' }}></div>
            
            <div className="mb-8 relative z-10" style={{ background: 'var(--background-elevated)', padding: '1.5rem', borderRadius: '2rem', border: '2px solid var(--border-default)' }}>
              <div style={{ background: 'var(--background-card)', padding: '1rem', borderRadius: '1rem' }}>
                {storedWallet?.publicKey && (
                  <QRCode 
                    value={storedWallet.publicKey} 
                    size={240} 
                    level="Q"
                    className="rounded-lg"
                    fgColor="#0f172a"
                  />
                )}
              </div>
            </div>
            
            <h2 className="mb-2 relative z-10" style={{ color: 'var(--foreground-primary)' }}>Scan to Receive</h2>
            <p className="font-medium text-sm relative z-10 max-w-xs" style={{ color: 'var(--foreground-secondary)' }}>Ask the sender to scan this QR code with their mobile wallet to send assets to you instantly.</p>
          </div>

          {/* Right: Address Info & Actions */}
          <div className="flex flex-col gap-6">
            
            <div className="panel flex flex-col relative overflow-hidden p-10">
              <div className="w-12 h-12 flex items-center justify-center mb-6" style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)', borderRadius: '0.75rem' }}>
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              
              <h3 className="section-title mb-2" style={{ fontSize: '1.5rem' }}>Your Public Address</h3>
              <p className="text-sm font-medium mb-6" style={{ color: 'var(--foreground-secondary)' }}>This is your unique Stellar network address. You can share this safely with anyone to receive payments.</p>

              <div style={{ background: 'var(--background-elevated)', border: '2px solid var(--border-default)', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <p className="font-mono text-sm break-all leading-relaxed font-bold" style={{ color: 'var(--foreground-primary)' }}>
                  {storedWallet?.publicKey}
                </p>
              </div>

              <button 
                onClick={copyToClipboard}
                className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-1 ${
                  copied 
                    ? "bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)]" 
                    : "shadow-[0_8px_20px_rgba(79,70,229,0.3)]"
                }`}
                style={!copied ? { background: 'var(--accent-primary)', color: 'white' } : undefined}
              >
                {copied ? (
                  <><CheckCircle2 className="w-6 h-6" /> Copied to Clipboard!</>
                ) : (
                  <><Copy className="w-6 h-6" /> Copy Address</>
                )}
              </button>
            </div>

            {/* Network Warning */}
            <div className="rounded-[2.5rem] p-8 flex gap-5 items-start" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.2)', color: '#d97706' }}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-extrabold mb-1" style={{ color: 'var(--foreground-primary)' }}>Stellar Network Only</h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>Please ensure the sender is sending XLM or supported assets on the Stellar network. Sending assets from other networks may result in permanent loss.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
