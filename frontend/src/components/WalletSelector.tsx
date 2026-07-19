"use client";

import { useWallet } from "./providers";
import { WalletType } from "@/lib/wallet";
import { useState } from "react";
import { Check, Loader2, Wallet } from "lucide-react";

export default function WalletSelector() {
  const { activeWalletType, publicKey, connectWallet } = useWallet();
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wallets = [
    {
      id: "local" as WalletType,
      name: "Atreus Local Wallet",
      description: "In-browser keypair secured with Google / BIP39 seed phrase",
      color: "bg-indigo-50 border-indigo-200 text-indigo-700",
      iconColor: "text-indigo-600",
    },
    {
      id: "freighter" as WalletType,
      name: "Freighter Wallet",
      description: "Official Stellar browser extension",
      color: "bg-blue-50 border-blue-200 text-blue-700",
      iconColor: "text-blue-600",
    },
    {
      id: "xbull" as WalletType,
      name: "xBull Wallet",
      description: "Connect to xBull extension or web application",
      color: "bg-amber-50 border-amber-200 text-amber-700",
      iconColor: "text-amber-600",
    },
    {
      id: "lobstr" as WalletType,
      name: "LOBSTR Wallet",
      description: "Connect and sign with LOBSTR signer extension",
      color: "bg-emerald-50 border-emerald-200 text-emerald-700",
      iconColor: "text-emerald-600",
    },
  ];

  const handleSelect = async (type: WalletType) => {
    if (activeWalletType === type && publicKey) {
      return;
    }
    setConnectingType(type);
    setError(null);
    try {
      await connectWallet(type);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || `Failed to connect ${type} wallet.`);
    } finally {
      setConnectingType(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-2xl text-xs font-semibold bg-red-50 border border-red-100 text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {wallets.map((w) => {
          const isActive = activeWalletType === w.id && !!publicKey;
          const isConnecting = connectingType === w.id;

          return (
            <button
              key={w.id}
              onClick={() => handleSelect(w.id)}
              disabled={isConnecting}
              className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                isActive
                  ? "bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/20"
                  : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${w.color}`}>
                {isConnecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Wallet className={`w-5 h-5 ${w.iconColor}`} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  {w.name}
                  {isActive && (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border border-green-100">
                      <Check className="w-2.5 h-2.5" /> Connected
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                  {w.description}
                </p>
                {isActive && publicKey && (
                  <p className="text-[10px] font-mono text-slate-400 mt-2 truncate bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                    {publicKey}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
