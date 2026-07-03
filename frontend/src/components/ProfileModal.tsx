"use client";

import { useRouter } from "next/navigation";
import { Copy, Check, LogOut, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSidebar } from "./sidebar-context";
import { loadWallet, clearWallet } from "@/lib/wallet";

export default function ProfileModal() {
  const router = useRouter();
  const { profileOpen, setProfileOpen } = useSidebar();
  const [copied, setCopied] = useState(false);
  const wallet = loadWallet();
  if (!profileOpen || !wallet) return null;

  const emailName = wallet.email ? wallet.email.split('@')[0] : 'User';
  const displayAddress = wallet.publicKey ? `${wallet.publicKey.slice(0, 5)}...${wallet.publicKey.slice(-4)}` : '';

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    clearWallet();
    setProfileOpen(false);
    router.push("/wallet");
  };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={() => setProfileOpen(false)} style={{ background: 'rgba(0,0,0,0.5)' }} />
      <motion.div
        className="fixed left-[calc(280px+1rem)] bottom-24 z-50 w-[300px] modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-[var(--accent-primary)] text-white">
              {emailName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-primary">{emailName}</span>
              <span className="text-[10px] text-secondary">{displayAddress}</span>
            </div>
          </div>
          <button onClick={() => setProfileOpen(false)} className="btn btn-icon btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2.5 space-y-0.5">
          <button onClick={copyAddress} className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-[var(--background-elevated)] transition-colors text-left">
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-secondary" />}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">{copied ? 'Copied!' : 'Copy Address'}</span>
              <span className="text-[10px] text-secondary">{wallet.publicKey.slice(0, 12)}...</span>
            </div>
          </button>

          <button onClick={() => { setProfileOpen(false); router.push("/settings"); }} className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-[var(--background-elevated)] transition-colors text-left">
            <ExternalLink className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary">Settings</span>
          </button>

          <div className="h-px bg-[var(--border-default)] my-1" />

          <button onClick={handleDisconnect} className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-[var(--background-elevated)] transition-colors text-left">
            <LogOut className="w-4 h-4 text-error" />
            <span className="text-sm font-medium text-error">Disconnect</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
