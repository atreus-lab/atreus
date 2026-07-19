"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getBalance, type StoredWallet } from "@/lib/wallet";
import { useWallet } from "@/components/providers";
import WalletSelector from "@/components/WalletSelector";
import { Copy, Check, Eye, EyeOff, LogOut, Wallet } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import EmptyState from "@/components/ui/EmptyState";
import BalanceCard from "@/components/BalanceCard";

export default function WalletPage() {
  const router = useRouter();
  const { activeWalletType, publicKey, disconnectWallet } = useWallet();
  const [localWallet, setLocalWallet] = useState<StoredWallet | null>(null);
  const [balance, setBalance] = useState("0");
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState<"address" | "mnemonic" | null>(null);

  useEffect(() => {
    const w = loadWallet();
    setLocalWallet(w);

    if (publicKey) {
      getBalance(publicKey)
        .then(setBalance)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setBalance("0");
      setLoading(false);
    }
  }, [publicKey]);

  const copyToClipboard = async (type: "address" | "mnemonic", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    if (activeWalletType === "local") {
      router.push("/onboard");
    }
  };

  return (
    <>
      <AppHeader 
        title="Wallet" 
        subtitle={publicKey ? `Manage your connected wallet (${activeWalletType})` : "Connect your wallet"} 
        backHref="/dashboard" 
      />
      <div className="app-content">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : !publicKey ? (
          <div className="flex flex-col items-center justify-center gap-6 max-w-md mx-auto">
            <div className="panel p-8 text-center w-full">
              <EmptyState
                icon={<Wallet className="w-6 h-6" />}
                title="No Wallet Connected"
                description="Connect an existing wallet or set up an Atreus local wallet."
                action={
                  <Link href="/onboard" className="btn-primary inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold rounded-lg">
                    Set Up Wallet
                  </Link>
                }
              />
            </div>
            
            <div className="panel p-6 w-full space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-center">
                Select Wallet Provider
              </h3>
              <WalletSelector />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Balance Panel */}
            <BalanceCard
              balance={balance}
              showBalance={showBalance}
              onToggleBalance={() => setShowBalance(!showBalance)}
              onClaimClick={() => router.push("/claim")}
              onCreateLinkClick={() => router.push("/create")}
            />

            {activeWalletType === "local" && localWallet?.email && (
              <div className="flex justify-end -mt-4 px-2">
                <p className="text-xs font-semibold text-slate-500">
                  Connected as <span className="text-slate-300 font-bold">{localWallet.email}</span>
                </p>
              </div>
            )}

            {/* Address Panel */}
            <div className="panel">
              <div className="panel-header">
                <h2 className="section-title">Wallet Address ({activeWalletType})</h2>
              </div>
              <div className="panel-body">
                <div className="flex items-center gap-3">
                  <code className="flex-1 font-mono text-sm break-all select-all text-primary">
                    {publicKey}
                  </code>
                  <button onClick={() => copyToClipboard("address", publicKey)} className="btn btn-icon bg-elevated shrink-0" style={{ border: '1px solid var(--border-default)', borderRadius: '0.5rem' }}>
                    {copied === "address" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-secondary" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Local Recovery Phrase Panel (Only if using local wallet) */}
            {activeWalletType === "local" && localWallet && (
              <div className="panel">
                <div className="panel-header">
                  <h2 className="section-title">Recovery Phrase</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowMnemonic(!showMnemonic)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-elevated text-secondary" style={{ border: '1px solid var(--border-default)' }}>
                      {showMnemonic ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Reveal</>}
                    </button>
                    <button onClick={() => copyToClipboard("mnemonic", localWallet.mnemonic)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-elevated text-secondary" style={{ border: '1px solid var(--border-default)' }}>
                      {copied === "mnemonic" ? <><Check className="w-3.5 h-3.5 text-success" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                </div>
                <div className="panel-body">
                  <p className="text-xs font-medium mb-4 text-secondary">Save these 24 words — they are the only way to restore your wallet.</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {localWallet.mnemonic.split(" ").map((word, i) => (
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
            )}

            {/* Wallet Selector Panel */}
            <div className="panel p-6">
              <h2 className="section-title mb-4">Switch Wallet Provider</h2>
              <WalletSelector />
            </div>

            {/* Danger Zone / Disconnect */}
            <div className="panel" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="panel-header" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <h2 className="section-title text-error">Disconnect Wallet</h2>
              </div>
              <div className="panel-body">
                <p className="text-sm font-medium mb-4 text-secondary">
                  {activeWalletType === "local" 
                    ? "Remove this wallet from this device. Funds can be restored with the recovery phrase." 
                    : "Disconnect this wallet from Atreus."}
                </p>
                <button onClick={handleDisconnect} className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-[rgba(239,68,68,0.08)] text-error border border-[rgba(239,68,68,0.2)] transition-colors hover:bg-[rgba(239,68,68,0.12)]">
                  <LogOut className="w-4 h-4" /> {activeWalletType === "local" ? "Remove Wallet" : "Disconnect Wallet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
