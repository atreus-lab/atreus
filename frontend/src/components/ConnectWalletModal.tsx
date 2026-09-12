"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Check, Loader2, X } from "lucide-react";
import { useWallet } from "./providers";
import { WalletType } from "@/lib/wallet";
import { FreighterWalletProvider } from "@/lib/wallets/freighter";
import { LobstrWalletProvider } from "@/lib/wallets/lobstr";
import { XBullWalletProvider } from "@/lib/wallets/xbull";

const LOGO_SRC: Record<string, string> = {
  freighter: "/freighter.png",
  lobstr: "/lobstr.png",
  xbull: "/xbull.png",
};

function LocalIcon({ className }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center overflow-hidden rounded-lg bg-white ${className ?? ""}`}>
      <Image src="/ateruslogo.svg" alt="Atreus logo" width={64} height={64} className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}

export function WalletPlatformIcon({ type, className }: { type: WalletType; className?: string }) {
  const src = LOGO_SRC[type];
  if (!src) return <LocalIcon className={className} />;
  return (
    <span className={`flex items-center justify-center overflow-hidden rounded-lg bg-white ${className ?? ""}`}>
      <Image src={src} alt={`${type} logo`} width={64} height={64} className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}

interface WalletOption {
  id: WalletType;
  name: string;
  description: string;
}

const WALLETS: WalletOption[] = [
  { id: "freighter", name: "Freighter", description: "Official Stellar browser extension" },
  { id: "lobstr", name: "LOBSTR", description: "Signer extension by LOBSTR" },
  { id: "xbull", name: "xBull", description: "Connect to xBull extension or web" },
  { id: "local", name: "Atreus Local", description: "In-browser keypair wallet" },
];

function isAvailable(type: WalletType): boolean {
  try {
    switch (type) {
      case "freighter": return new FreighterWalletProvider().isAvailable();
      case "lobstr": return new LobstrWalletProvider().isAvailable();
      case "xbull": return new XBullWalletProvider().isAvailable();
      default: return true;
    }
  } catch {
    return false;
  }
}

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const { connectWallet, activeWalletType, publicKey } = useWallet();
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSelect = async (type: WalletType) => {
    if (activeWalletType === type && publicKey) {
      onClose();
      return;
    }
    setConnectingType(type);
    setError(null);
    try {
      await connectWallet(type);
      onClose();
    } catch (err: any) {
      const raw = err?.message;
      const detail = typeof raw === "string" && raw.trim() ? raw.trim() : null;
      setError(detail ? `Wallet connection failed: ${detail}` : "Wallet connection failed. Please try again.");
    } finally {
      setConnectingType(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} style={{ background: 'rgba(0,0,0,0.5)' }} />
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-grey-800">Connect wallet</h3>
              <p className="mt-0.5 text-sm text-grey-500">Choose a wallet to connect to Atreus</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-grey-600 transition-colors hover:bg-grey-25 active:bg-grey-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-error">
              {error}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            {WALLETS.map(w => {
              const isActive = activeWalletType === w.id && !!publicKey;
              const isConnecting = connectingType === w.id;
              const available = isAvailable(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => handleSelect(w.id)}
                  disabled={isConnecting}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    isActive
                      ? "border-[#007CBF]/30 bg-blue-25"
                      : "border-grey-100 bg-white hover:bg-grey-25 active:bg-grey-50"
                  } disabled:opacity-70`}
                >
                  <WalletPlatformIcon type={w.id} className="h-10 w-10 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold text-grey-800">{w.name}</span>
                    <span className="truncate text-xs text-grey-500">{w.description}</span>
                  </span>
                  <span className="flex shrink-0 items-center">
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primaryBlue" />
                    ) : isActive ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-success">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    ) : !available ? (
                      <span className="rounded-full bg-grey-25 px-2.5 py-1 text-[11px] font-semibold text-grey-500">Not installed</span>
                    ) : (
                      <span className="rounded-full bg-grey-25 px-2.5 py-1 text-[11px] font-semibold text-grey-500">Install</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
