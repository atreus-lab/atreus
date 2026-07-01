"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { connectWallet, createEscrowTx } from "@/lib/stellar";

type Status = "idle" | "connecting" | "signing" | "confirming";

export default function CreatePage() {
  const [amount, setAmount] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isCreating = status !== "idle";

  const handleCreate = async () => {
    try {
      setError("");
      setStatus("connecting");

      const creator = await connectWallet();

      // Secret must be 32 bytes for BytesN<32>, hash it with SHA256 to get the link_hash
      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secretHex = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      // Hash the secret using Poseidon
      const secretBigInt = BigInt('0x' + secretHex);
      const hashBigInt = poseidon1([secretBigInt]);

      // Convert hash back to 32 bytes for the contract
      const hashHex = hashBigInt.toString(16).padStart(64, '0');
      const hashBytes = new Uint8Array(hashHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));

      setStatus("signing");
      // Note: createEscrowTx internally submits AND waits for on-chain confirmation,
      // so this awaits through both the "signing" and "confirming" phases.
      setStatus("confirming");
      await createEscrowTx(creator, amount, hashBytes);

      const url = new URL(window.location.origin);
      url.pathname = "/claim";
      url.hash = secretHex;
      setLink(url.toString());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create link");
    } finally {
      setStatus("idle");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — please copy the link manually.");
    }
  };

  const buttonLabel: Record<Status, string> = {
    idle: "Generate Link",
    connecting: "Connecting wallet...",
    signing: "Waiting for signature...",
    confirming: "Confirming on Stellar...",
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
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}

      <button
        onClick={handleCreate}
        className="btn-primary flex items-center justify-center gap-2 w-full mt-4"
        disabled={isCreating || !amount || parseFloat(amount) <= 0}
      >
        {isCreating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {buttonLabel[status]}
          </>
        ) : (
          "Generate Link"
        )}
      </button>

      {link && (
        <div className="link-preview mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="input-label mb-2">Share this link:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={link}
              className="input flex-1 bg-white text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}