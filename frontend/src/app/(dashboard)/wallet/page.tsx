"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getBalance, clearWallet, type StoredWallet } from "@/lib/wallet";
import { Copy, Check, Eye, EyeOff, LogOut, Wallet } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import EmptyState from "@/components/ui/EmptyState";

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
      <AppHeader title="Wallet" subtitle={wallet ? "Manage your wallet and keys" : "Create or restore your wallet"} backHref="/dashboard" />
      <div className="app-content">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : !wallet ? (
          <div className="flex flex-col items-center justify-center">
            <div className="panel p-8 text-center max-w-md w-full">
              <EmptyState
                icon={<Wallet className="w-6 h-6" />}
                title="No Wallet Found"
                description="Create a new wallet or restore an existing one."
                action={
                  <Link href="/onboard" className="btn-primary inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold rounded-lg">
                    Create or Restore Wallet
                  </Link>
                }
              />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Balance Panel */}
            <div className="panel">
              <div className="panel-header">
                <h2 className="section-title">Balance</h2>
                <Wallet className="w-4 h-4 text-accent" />
              </div>
              <div className="panel-body">
                <p className="text-4xl font-extrabold tracking-tight text-primary">
                  {parseFloat(balance).toFixed(2)}{" "}
                  <span className="text-lg font-semibold text-secondary">XLM</span>
                </p>
                {wallet.email && (
                  <p className="text-sm font-medium mt-2 text-secondary">
                    Connected as <span className="text-primary">{wallet.email}</span>
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
                  <code className="flex-1 font-mono text-sm break-all select-all text-primary">
                    {wallet.publicKey}
                  </code>
                  <button onClick={() => copyToClipboard("address", wallet.publicKey)} className="btn btn-icon bg-elevated shrink-0" style={{ border: '1px solid var(--border-default)', borderRadius: '0.5rem' }}>
                    {copied === "address" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-secondary" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Recovery Phrase Panel */}
            <div className="panel">
              <div className="panel-header">
                <h2 className="section-title">Recovery Phrase</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMnemonic(!showMnemonic)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-elevated text-secondary" style={{ border: '1px solid var(--border-default)' }}>
                    {showMnemonic ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Reveal</>}
                  </button>
                  <button onClick={() => copyToClipboard("mnemonic", wallet.mnemonic)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-elevated text-secondary" style={{ border: '1px solid var(--border-default)' }}>
                    {copied === "mnemonic" ? <><Check className="w-3.5 h-3.5 text-success" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
              </div>
              <div className="panel-body">
                <p className="text-xs font-medium mb-4 text-secondary">Save these 24 words — they are the only way to restore your wallet.</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {wallet.mnemonic.split(" ").map((word, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-elevated" style={{ border: '1px solid var(--border-default)' }}>
                      <span className="text-[10px] font-bold tabular-nums text-secondary">{i + 1}</span>
                      <span className="text-xs font-bold tracking-wide text-primary">
                        {showMnemonic ? word : "•••••"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="panel" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="panel-header" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <h2 className="section-title text-error">Danger Zone</h2>
              </div>
              <div className="panel-body">
                <p className="text-sm font-medium mb-4 text-secondary">Remove this wallet from this device. Funds can be restored with the recovery phrase.</p>
                <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-[rgba(239,68,68,0.08)] text-error border border-[rgba(239,68,68,0.2)] transition-colors hover:bg-[rgba(239,68,68,0.12)]">
                  <LogOut className="w-4 h-4" /> Remove Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
