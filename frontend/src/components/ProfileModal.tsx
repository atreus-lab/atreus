"use client";

import { useRouter } from "next/navigation";
import { Copy, Check, LogOut, ExternalLink, X } from "lucide-react";
import { useState } from "react";
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
      <div className="fixed left-[calc(280px+1rem)] bottom-24 z-50 w-[320px] animate-in" style={{ background: 'var(--background-card)', border: '1px solid var(--border-default)', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'var(--accent-primary)', color: 'white' }}>
              {emailName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold" style={{ color: 'var(--foreground-primary)' }}>{emailName}</span>
              <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{displayAddress}</span>
            </div>
          </div>
          <button onClick={() => setProfileOpen(false)} className="btn-icon btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-1">
          <button onClick={copyAddress} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[var(--background-elevated)] transition-colors text-left">
            {copied ? <Check className="w-4 h-4" style={{ color: 'var(--success)' }} /> : <Copy className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />}
            <div className="flex flex-col">
              <span className="text-sm font-medium" style={{ color: 'var(--foreground-primary)' }}>{copied ? 'Copied!' : 'Copy Address'}</span>
              <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{wallet.publicKey.slice(0, 12)}...</span>
            </div>
          </button>

          <button onClick={() => { setProfileOpen(false); router.push("/settings"); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[var(--background-elevated)] transition-colors text-left">
            <ExternalLink className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground-primary)' }}>Settings</span>
          </button>

          <div style={{ borderTop: '1px solid var(--border-default)' }} className="my-1" />

          <button onClick={handleDisconnect} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[var(--background-elevated)] transition-colors text-left">
            <LogOut className="w-4 h-4" style={{ color: '#f87171' }} />
            <span className="text-sm font-medium" style={{ color: '#f87171' }}>Disconnect</span>
          </button>
        </div>
      </div>
    </>
  );
}
