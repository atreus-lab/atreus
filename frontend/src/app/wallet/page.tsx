"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateWallet, fundWallet, loadWallet, clearWallet, getPublicKey, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { Loader2, Check, ExternalLink, Trash2 } from "lucide-react";

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = loadWallet();
    if (existing) {
      setWallet(existing);
      getBalance(existing.publicKey).then(b => setBalance(b));
    }
    setLoading(false);
  }, []);

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError("");

      const newWallet = generateWallet();
      setWallet(newWallet);

      const funded = await fundWallet(newWallet.publicKey);
      if (!funded) {
        setError("Wallet created but funding failed. You may need to fund it manually.");
      }

      const bal = await getBalance(newWallet.publicKey);
      setBalance(bal);
    } catch (err: any) {
      setError(err.message || "Failed to create wallet");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = () => {
    clearWallet();
    setWallet(null);
    setBalance("0");
  };

  if (loading) {
    return (
      <div className="page">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="w-full max-w-md space-y-6">
        <h1 className="card-title">Atreus Wallet</h1>

        {wallet ? (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Wallet Ready</h2>
              <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-900/30 text-[var(--error)] transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="status-badge">
              <p className="text-xs break-all font-mono">{wallet.publicKey}</p>
            </div>

            <div className="text-center">
              <p className="input-label">Balance</p>
              <p className="text-3xl font-bold font-mono">{parseFloat(balance).toFixed(7)} XLM</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => router.push("/dashboard")} className="btn-primary flex-1">
                Go to Dashboard
              </button>
              <a href={getExplorerUrl("account", wallet.publicKey)} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center justify-center px-4">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {error && <p className="status-error text-sm">{error}</p>}
          </div>
        ) : (
          <div className="card space-y-6 text-center">
            <p className="card-body">
              Create a Stellar wallet instantly. No extension needed — works in your browser.
            </p>

            {error && <p className="status-error text-sm">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating Wallet...</>
              ) : (
                <><Check className="w-4 h-4" /> Create New Wallet</>
              )}
            </button>

            <p className="text-xs text-[var(--foreground-secondary)]">
              Wallet will be funded from Stellar testnet faucet (friendbot).
              Keys stored locally in your browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
