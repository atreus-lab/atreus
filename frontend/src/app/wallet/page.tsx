"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { generateWallet, fundWallet, loadWallet, clearWallet, restoreFromMnemonic, validateMnemonic, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { Loader2, ExternalLink, Plus, Trash2, Eye, EyeOff, LogIn, Copy, Check, ChromeIcon } from "lucide-react";

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

  const finishWallet = async (w: StoredWallet) => {
    setWallet(w);
    setView("ready");
    const funded = await fundWallet(w.publicKey);
    if (!funded) setError("Wallet created but funding failed. You may need to fund it manually.");
    const bal = await getBalance(w.publicKey);
    setBalance(bal);
  };

  const handleCreate = async (email?: string) => {
    try {
      setCreating(true);
      setError("");
      const w = await generateWallet(email);
      await finishWallet(w);
    } catch (err: any) {
      setError(err.message || "Failed to create wallet");
    } finally {
      setCreating(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setCreating(true);
        setError("");
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const user = await res.json();
        const w = await generateWallet(user.email);
        await finishWallet(w);
      } catch (err: any) {
        setError(err.message || "Google sign-in failed");
      } finally {
        setCreating(false);
      }
    },
    onError: () => setError("Google sign-in failed"),
  });

  const handleRestore = async () => {
    try {
      setError("");
      if (!validateMnemonic(mnemonicInput.trim())) {
        setError("Invalid seed phrase. Check spelling and try again.");
        return;
      }
      const restored = await restoreFromMnemonic(mnemonicInput.trim());
      await finishWallet(restored);
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
            <button onClick={handleDelete} className="btn-secondary btn-icon" title="Remove wallet">
              <Trash2 className="icon-sm" />
            </button>
          </div>

          <div className="status-badge flex-row">
            <span className="mono-text">{wallet.publicKey.slice(0, 12)}...{wallet.publicKey.slice(-8)}</span>
            <a href={getExplorerUrl("account", wallet.publicKey)} target="_blank" rel="noopener noreferrer" className="link-primary">
              <ExternalLink className="icon-sm" />
            </a>
          </div>

          {wallet.email && <p className="input-label">Signed in as {wallet.email}</p>}

          <div className="text-centered">
            <p className="input-label">Balance</p>
            <p className="balance-value">{parseFloat(balance).toFixed(7)} XLM</p>
          </div>

          <div className="card-flush">
            <p className="input-label">Recovery Phrase</p>
            <p className="detail-text">
              Save these 24 words somewhere safe. You need them to restore your wallet if you lose access.
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

          <button onClick={() => router.push("/dashboard")} className="btn-primary">
            Go to Dashboard
          </button>

          {error && <p className="status-error">{error}</p>}
        </div>
      ) : (
        <div className="card">
          <h2 className="card-title">Atreus Wallet</h2>
          <p className="card-body">
            No wallet found. Sign in with Google or create a new wallet.
          </p>

          <button
            onClick={() => handleGoogleLogin()}
            disabled={creating}
            className="btn-primary flex-center-row"
          >
            {creating ? (
              <><Loader2 className="icon-sm icon-spin" /> Signing in...</>
            ) : (
              <><ChromeIcon className="icon-sm" /> Sign in with Google</>
            )}
          </button>

          <div className="divider-hr">
            <span className="divider-line"></span>
            <span className="detail-text">or</span>
            <span className="divider-line"></span>
          </div>

          <button
            onClick={() => handleCreate()}
            disabled={creating}
            className="btn-secondary flex-center-row"
          >
            <><Plus className="icon-sm" /> Create Anonymous Wallet</>
          </button>

          <button
            onClick={() => setView("restore")}
            className="btn-secondary flex-center-row"
          >
            <><LogIn className="icon-sm" /> Restore from Seed Phrase</>
          </button>

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
