"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { connectWallet, createEscrowTx } from "@/lib/stellar";

export default function CreatePage() {
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setError("");

      const creator = await connectWallet();

      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secretHex = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const hashBytes = new Uint8Array(
        await crypto.subtle.digest("SHA-256", secretBytes)
      );

      await createEscrowTx(creator, amount, hashBytes);

      const url = new URL(window.location.origin);
      url.pathname = "/claim";
      url.hash = secretHex;
      setLink(url.toString());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create link");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <h2 className="card-title">Create Link</h2>
      <div className="card-flush">
        <label className="input-label">Amount (XLM)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="input"
          disabled={isCreating}
        />
      </div>
      
      {error && (
        <div className="status-error">{error}</div>
      )}

      <button 
        onClick={handleCreate} 
        className="btn-primary flex-center-row"
        disabled={isCreating || !amount || parseFloat(amount) <= 0}
      >
        {isCreating ? (
          <><Loader2 className="icon-sm icon-spin" /> Generating...</>
        ) : (
          "Generate Link"
        )}
      </button>

      {link && (
        <div className="link-preview">
          <p className="input-label">Share this link:</p>
          <div className="flex-row">
            <input 
              type="text" 
              readOnly 
              value={link} 
              className="input"
            />
            <button 
              onClick={copyToClipboard}
              className="btn-secondary btn-icon-lg"
              title="Copy to clipboard"
            >
              {copied ? <Check className="icon-sm" /> : <Copy className="icon-sm" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
