"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateWallet, fundWallet, loadWallet, clearWallet, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { Loader2, ExternalLink, Plus, Trash2 } from "lucide-react";

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
        <Loader2 className="icon-lg icon-spin" />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="card-title">Atreus Wallet</h1>

      {wallet ? (
        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Wallet Ready</h2>
            <button onClick={handleDelete} className="btn-secondary btn-icon">
              <Trash2 className="icon-sm" />
            </button>
          </div>

          <div className="status-badge">
            <p className="mono-text">{wallet.publicKey}</p>
          </div>

          <div className="text-centered">
            <p className="input-label">Balance</p>
            <p className="balance-value">{parseFloat(balance).toFixed(7)} XLM</p>
          </div>

          <div className="flex-row">
            <button onClick={() => router.push("/dashboard")} className="btn-primary">
              Go to Dashboard
            </button>
            <a href={getExplorerUrl("account", wallet.publicKey)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <ExternalLink className="icon-sm" />
            </a>
          </div>

          {error && <p className="status-error">{error}</p>}
        </div>
      ) : (
        <div className="card text-centered">
          <p className="card-body">
            Create a Stellar wallet instantly. No extension needed — works in your browser.
          </p>

          {error && <p className="status-error">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary flex-center-row"
          >
            {creating ? (
              <><Loader2 className="icon-sm icon-spin" /> Creating Wallet...</>
            ) : (
              <><Plus className="icon-sm" /> Create New Wallet</>
            )}
          </button>

          <p className="detail-text">
            Wallet will be funded from Stellar testnet faucet (friendbot).
            Keys stored locally in your browser.
          </p>
        </div>
      )}
    </div>
  );
}
