"use client";

import { useEffect, useState } from "react";

export default function ClaimPage() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState("idle"); // idle, proving, claiming, success

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) setSecret(hash);
  }, []);

  const handleClaim = async () => {
    setStatus("proving");
    // Simulate ZK Proof generation
    setTimeout(() => {
      setStatus("claiming");
      // Simulate Soroban transaction
      setTimeout(() => {
        setStatus("success");
      }, 2000);
    }, 2000);
  };

  return (
    <div className="max-w-md w-full bg-slate-900 p-8 rounded-2xl border border-slate-800 space-y-6 text-center">
      <h2 className="text-2xl font-bold">Claim PayLink</h2>
      
      {secret ? (
        <div className="space-y-6">
          <p className="text-slate-400">
            A payment has been found! Verify your identity to claim it.
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs overflow-hidden">
            Link Secret: {secret}
          </div>
          
          <button 
            disabled={status !== "idle"}
            onClick={handleClaim}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 p-4 rounded-lg font-bold transition flex items-center justify-center gap-2"
          >
            {status === "idle" && "Claim with Passkey"}
            {status === "proving" && "Generating ZK Proof..."}
            {status === "claiming" && "Broadcasting to Stellar..."}
            {status === "success" && "Success!"}
          </button>
        </div>
      ) : (
        <p className="text-red-400">No secret found in URL. Please use a valid PayLink.</p>
      )}

      {status === "success" && (
        <div className="mt-4 text-green-400 animate-bounce">
          🎉 Funds have been transferred to your wallet!
        </div>
      )}
    </div>
  );
}
