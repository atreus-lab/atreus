"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Copy, Check, LogOut, X } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { useSidebar } from "./sidebar-context";
import { loadWallet, clearWallet } from "@/lib/wallet";

export default function ProfileModal() {
  const router = useRouter();
  const { profileOpen, setProfileOpen, requestSettings, requestSecurity, requestActivity } = useSidebar();
  const [copied, setCopied] = useState(false);
  const wallet = loadWallet();
  if (!profileOpen || !wallet) return null;

  const emailName = wallet.email ? wallet.email.split('@')[0] : 'User';

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openSettings = () => {
    setProfileOpen(false);
    requestSettings();
  };

  const openSecurity = () => {
    setProfileOpen(false);
    requestSecurity();
  };

  const openActivity = () => {
    setProfileOpen(false);
    requestActivity();
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
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white shadow-[0_0_40px_rgba(0,0,0,0.15)]"
        style={{ width: 'min(320px, 100vw)' }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/ateruslogo.svg" alt="Atreus logo" width={32} height={32} className="h-8 w-8 cursor-pointer object-contain" draggable={false} />
            <span
              className="text-[22px] font-extrabold tracking-tight text-black"
              style={{ fontFamily: 'var(--font-manrope), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            >
              Atreus
            </span>
          </div>
          <button onClick={() => setProfileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-grey-600 transition-colors hover:bg-grey-25 active:bg-grey-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center px-5 pb-4">
          <div className="mr-3 flex h-[60px] w-[60px] shrink-0 select-none items-center justify-center rounded-full border border-[#E0E7EB] bg-primaryBlue text-xl font-bold text-white">
            {emailName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-grey-800">{emailName}</p>
            {wallet.email && <p className="truncate text-sm text-grey-800">{wallet.email}</p>}
          </div>
        </div>

        <div className="mx-5 rounded-lg border border-grey-100 bg-grey-25 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-grey-500">Wallet Address</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-grey-800">
              {wallet.publicKey.slice(0, 5)}...{wallet.publicKey.slice(-4)}
            </span>
            <button onClick={copyAddress} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E0E7EB] bg-white text-grey-700 transition-colors hover:bg-grey-50 active:bg-grey-100" aria-label="Copy address">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
          <button
            onClick={copyAddress}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold text-grey-800 transition-colors hover:bg-grey-25 active:bg-grey-50"
          >
            {copied ? "Copied!" : "Copy Address"}
          </button>

          <button
            onClick={openActivity}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold text-grey-800 transition-colors hover:bg-grey-25 active:bg-grey-50"
          >
            Activity
          </button>

          <button
            onClick={openSecurity}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold text-grey-800 transition-colors hover:bg-grey-25 active:bg-grey-50"
          >
            Security
          </button>

          <button
            onClick={openSettings}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-sm font-semibold text-grey-800 transition-colors hover:bg-grey-25 active:bg-grey-50"
          >
            Settings
          </button>
        </div>

        <div className="border-t border-t-grey-100 px-3 pt-2">
          <button
            onClick={handleDisconnect}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3.5 text-left text-sm font-semibold text-error transition-colors hover:bg-red-50 active:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}
