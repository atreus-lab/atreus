"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getBalance, clearWallet, type StoredWallet } from "@/lib/wallet";
import { Copy, Check, Eye, EyeOff, LogOut, ExternalLink, Wallet } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState<"address" | "mnemonic" | null>(null);

  useEffect(() => {
    const w = loadWallet();
    if (!w) { setLoading(false); return; }
    setWallet(w);
    getBalance(w.publicKey).then(setBalance).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="app-content flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  if (!wallet) {
    return (
      <>
        <AppHeader title="Wallet" subtitle="Create or restore your wallet" />
        <div className="app-content flex flex-col items-center justify-center">
          <div className="panel p-8 text-center max-w-md">
            <Wallet className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="section-title mb-2">No Wallet Found</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>Create a new wallet or restore an existing one.</p>
            <Link href="/onboard" className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold rounded-xl" style={{ background: 'var(--accent-primary)', color: 'white' }}>
              Create or Restore Wallet
            </Link>
          </div>
        </div>
      </>
    );
  }

  const emailName = wallet.email?.split('@')[0] || 'User';
  const copyToClipboard = async (type: "address" | "mnemonic", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };
  const handleClear = () => {
    clearWallet();
    router.push("/onboard");
  };

  return (
    <>
      <AppHeader title="Wallet" subtitle="Manage your wallet and keys" backHref="/dashboard" />
      <div className="app-content">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Balance Panel */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="section-title">Balance</h2>
              <Wallet className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="panel-body">
              <p className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--foreground-primary)' }}>
                {parseFloat(balance).toFixed(2)}{" "}
                <span className="text-lg font-semibold" style={{ color: 'var(--foreground-secondary)' }}>XLM</span>
              </p>
              {wallet.email && (
                <p className="text-sm font-medium mt-2" style={{ color: 'var(--foreground-secondary)' }}>
                  Connected as <span style={{ color: 'var(--foreground-primary)' }}>{wallet.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Address Panel */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="section-title">Wallet Address</h2>
            </div>
            <div className="panel-body">
              <div className="flex items-center gap-3">
                <code className="flex-1 font-mono text-sm break-all select-all" style={{ color: 'var(--foreground-primary)' }}>
                  {wallet.publicKey}
                </code>
                <button onClick={() => copyToClipboard("address", wallet.publicKey)} className="btn-icon shrink-0" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', borderRadius: '0.5rem' }}>
                  {copied === "address" ? <Check className="w-4 h-4" style={{ color: '#22c55e' }} /> : <Copy className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />}
                </button>
              </div>
            </div>
          </div>

          {/* Recovery Phrase Panel */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="section-title">Recovery Phrase</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowMnemonic(!showMnemonic)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', color: 'var(--foreground-secondary)' }}>
                  {showMnemonic ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Reveal</>}
                </button>
                <button onClick={() => copyToClipboard("mnemonic", wallet.mnemonic)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', color: 'var(--foreground-secondary)' }}>
                  {copied === "mnemonic" ? <><Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </div>
            <div className="panel-body">
              <p className="text-xs font-medium mb-4" style={{ color: 'var(--foreground-secondary)' }}>Save these 24 words — they are the only way to restore your wallet.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {wallet.mnemonic.split(" ").map((word, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 p-2 rounded-lg" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)' }}>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--foreground-secondary)' }}>{i + 1}</span>
                    <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--foreground-primary)' }}>
                      {showMnemonic ? word : "•••••"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="panel" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="panel-header" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <h2 className="section-title" style={{ color: '#ef4444' }}>Danger Zone</h2>
            </div>
            <div className="panel-body">
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--foreground-secondary)' }}>Remove this wallet from this device. Funds can be restored with the recovery phrase.</p>
              <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <LogOut className="w-4 h-4" /> Remove Wallet
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
