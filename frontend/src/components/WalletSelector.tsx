"use client";

import { useWallet } from "./providers";
import { WalletType } from "@/lib/wallet";
import { useState } from "react";
import { Check, Loader2, Wallet, LogOut } from "lucide-react";

export default function WalletSelector() {
  const { activeWalletType, publicKey, connectWallet, disconnectWallet } = useWallet();
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wallets = [
    {
      id: "local" as WalletType,
      name: "Atreus Local Wallet",
      description: "In-browser keypair secured with Google / BIP39 seed phrase",
      color: "bg-neutral-800 border-neutral-700 text-neutral-300",
      iconColor: "text-neutral-400",
    },
    {
      id: "freighter" as WalletType,
      name: "Freighter Wallet",
      description: "Official Stellar browser extension",
      color: "bg-neutral-800 border-neutral-700 text-neutral-300",
      iconColor: "text-neutral-400",
    },
    {
      id: "xbull" as WalletType,
      name: "xBull Wallet",
      description: "Connect to xBull extension or web application",
      color: "bg-neutral-800 border-neutral-700 text-neutral-300",
      iconColor: "text-neutral-400",
    },
    {
      id: "lobstr" as WalletType,
      name: "LOBSTR Wallet",
      description: "Connect and sign with LOBSTR signer extension",
      color: "bg-neutral-800 border-neutral-700 text-neutral-300",
      iconColor: "text-neutral-400",
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
        <div className="p-3.5 rounded-2xl text-xs font-semibold bg-red-950 border border-red-900 text-red-400">
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
              type="button"
              onClick={() => handleSelect(w.id)}
              disabled={isConnecting}
              className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all min-h-[88px] ${
                isActive
                  ? "bg-neutral-900 border-neutral-600 ring-2 ring-neutral-500/30"
                  : "bg-neutral-950 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50"
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
                <div className="flex items-center justify-between gap-2 min-h-[28px]">
                  <p className="text-sm font-extrabold text-neutral-100 flex items-center gap-1.5">
                    {w.name}
                    {isActive && (
                      <span className="inline-flex items-center gap-1 bg-green-950 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border border-green-800">
                        <Check className="w-2.5 h-2.5" /> Connected
                      </span>
                    )}
                  </p>
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    {isActive && activeWalletType !== "local" && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); disconnectWallet(); }}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
                        title="Disconnect"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-neutral-400 font-medium mt-0.5 leading-relaxed">
                  {w.description}
                </p>
                {isActive && publicKey && (
                  <p className="text-[10px] font-mono text-neutral-500 mt-2 truncate bg-neutral-900 border border-neutral-700 px-2 py-1 rounded-lg">
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
