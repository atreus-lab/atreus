"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateWallet, fundWallet, loadWallet, clearWallet, restoreFromMnemonic, validateMnemonic, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { Loader2, ExternalLink, Plus, Trash2, Eye, EyeOff, LogIn, Copy, Check } from "lucide-react";

type WalletView = "create" | "restore" | "ready";

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<WalletView>("create");
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [mnemonicCopied, setMnemonicCopied] = useState(false);

  useEffect(() => {
    const existing = loadWallet();
    if (existing) {
      setWallet(existing);
      setView("ready");
      getBalance(existing.publicKey).then(b => setBalance(b));
    }
    setLoading(false);
  }, []);

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError("");
      const newWallet = await generateWallet();
      setWallet(newWallet);
      setView("ready");
      const funded = await fundWallet(newWallet.publicKey);
      if (!funded) setError("Wallet created but funding failed. You may need to fund it manually.");
      const bal = await getBalance(newWallet.publicKey);
      setBalance(bal);
    } catch (err: any) {
      setError(err.message || "Failed to create wallet");
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    try {
      setError("");
      if (!validateMnemonic(mnemonicInput.trim())) {
        setError("Invalid seed phrase. Check spelling and try again.");
        return;
      }
      const restored = await restoreFromMnemonic(mnemonicInput.trim());
      setWallet(restored);
      setView("ready");
      const bal = await getBalance(restored.publicKey);
      setBalance(bal);
    } catch (err: any) {
      setError(err.message || "Failed to restore wallet");
    }
  };

  const handleDelete = () => {
    clearWallet();
    setWallet(null);
    setView("create");
    setBalance("0");
    setShowMnemonic(false);
  };

  const copyMnemonic = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.mnemonic);
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
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
      {view === "ready" && wallet ? (
        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Wallet Ready</h2>
            <button onClick={handleDelete} className="btn-secondary btn-icon">
              <Trash2 className="icon-sm" />
            </button>
          </div>

          <div className="status-badge">
            <p className="mono-text">{wallet.publicKey}</p>
            <a href={getExplorerUrl("account", wallet.publicKey)} target="_blank" rel="noopener noreferrer" className="link-primary">
              <ExternalLink className="icon-sm" />
            </a>
          </div>

          {wallet.email && <p className="input-label">Signed in as {wallet.email}</p>}

          <div className="text-centered">
            <p className="input-label">Balance</p>
            <p className="balance-value">{parseFloat(balance).toFixed(7)} XLM</p>
          </div>

          <div className="card">
            <p className="input-label">Recovery Phrase</p>
            <p className="detail-text">
              Save these 24 words somewhere safe. You need them to restore your wallet.
            </p>
            <div className="mnemonic-grid">
              {wallet.mnemonic.split(" ").map((word, i) => (
                <span key={i} className="mnemonic-word">
                  <span className="mnemonic-index">{i + 1}.</span> {showMnemonic ? word : "••••••"}
                </span>
              ))}
            </div>
            <div className="flex-row">
              <button onClick={() => setShowMnemonic(!showMnemonic)} className="btn-secondary">
                {showMnemonic ? <><EyeOff className="icon-sm" /> Hide</> : <><Eye className="icon-sm" /> Reveal</>}
              </button>
              <button onClick={copyMnemonic} className="btn-secondary">
                {mnemonicCopied ? <><Check className="icon-sm" /> Copied</> : <><Copy className="icon-sm" /> Copy</>}
              </button>
            </div>
          </div>

          <div className="flex-row">
            <button onClick={() => router.push("/dashboard")} className="btn-primary">
              Go to Dashboard
            </button>
          </div>

          {error && <p className="status-error">{error}</p>}
        </div>
      ) : (
        <div className="card">
          <h2 className="card-title">Atreus Wallet</h2>
          <p className="card-body">
            No wallet found. Create a new one or restore from a seed phrase.
          </p>

          <div className="flex-row">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary"
            >
              {creating ? (
                <><Loader2 className="icon-sm icon-spin" /> Creating...</>
              ) : (
                <><Plus className="icon-sm" /> New Wallet</>
              )}
            </button>
            <button
              onClick={() => setView("restore")}
              className="btn-secondary"
            >
              <><LogIn className="icon-sm" /> Restore</>
            </button>
          </div>

          {error && <p className="status-error">{error}</p>}

          {view === "restore" && (
            <div className="card-flush">
              <label className="input-label">Seed Phrase (24 words)</label>
              <textarea
                value={mnemonicInput}
                onChange={(e) => setMnemonicInput(e.target.value)}
                placeholder="Enter your 24-word seed phrase..."
                className="input"
                rows={3}
              />
              <button onClick={handleRestore} className="btn-primary">
                Restore Wallet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
