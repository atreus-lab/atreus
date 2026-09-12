"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Wallet, Menu, Check, ChevronDown, Bell } from "lucide-react";
import { loadWallet } from "@/lib/wallet";
import { useWallet } from "./providers";
import { useSidebar } from "./sidebar-context";
import ConnectWalletModal, { WalletPlatformIcon } from "./ConnectWalletModal";
import NotificationDropdown from "./NotificationDropdown";

function shortAddress(pk: string): string {
  return `${pk.slice(0, 4)}..${pk.slice(-4)}`;
}

export default function AppHeader() {
  const { setProfileOpen, notifications, markAllNotificationsRead, deleteNotification, deleteAllNotifications } = useSidebar();
  const { publicKey, activeWalletType, disconnectWallet } = useWallet();
  const [initial, setInitial] = useState("A");
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const externalConnected = activeWalletType !== "local" && !!publicKey;
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    try {
      const wallet = loadWallet();
      if (wallet?.email) setInitial(wallet.email.charAt(0).toUpperCase());
      else if (wallet?.publicKey) setInitial(wallet.publicKey.charAt(0).toUpperCase());
    } catch {}
  }, []);

  useEffect(() => {
    return () => { if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, []);

  const copyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="mt-1 flex items-center pb-1 pt-3 mobile:px-4 mobile:pb-4 sm:py-4 sm:pt-2 mid:px-5 px-2 !justify-between">
      <div className="flex items-center gap-5">
        <div className="flex h-11 items-center justify-center">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image src="/ateruslogo.svg" alt="Atreus logo" width={36} height={36} className="h-8 w-8 cursor-pointer object-contain sm:h-9 sm:w-9" draggable={false} />
            <span
              className="text-[22px] font-extrabold tracking-tight text-black sm:text-[26px]"
              style={{ fontFamily: 'var(--font-manrope), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            >
              Atreus
            </span>
          </Link>
        </div>
      </div>
      <div className="z-[1] flex flex-row gap-1 mobile:gap-2">
        <div className="!relative flex items-center visible">
          {externalConnected ? (
            <>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="wallet-adapter-button flex h-11 cursor-pointer !items-center !justify-center rounded-lg bg-white text-xs !font-semibold text-primaryBlue shadow-[0px_0px_40px_rgba(0,_0,_0,_0.06)] transition-all duration-150 ease-in-out hover:!bg-blue-25 active:!bg-blue-50 sm:text-base w-11 pl-2 mobile:w-auto mobile:gap-2 mobile:pl-5 mobile:pr-5"
                tabIndex={0}
                type="button"
                aria-label="Connected wallet"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <i className="wallet-adapter-button-start-icon">
                  <WalletPlatformIcon type={activeWalletType} className="h-6 w-6 shrink-0" />
                </i>
                <span className="chakra-text hidden items-center justify-center mobile:flex">
                  {copied ? "Copied" : shortAddress(publicKey)}
                </span>
                <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform mobile:block ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <ul
                    aria-label="dropdown-list"
                    role="menu"
                    className="wallet-adapter-dropdown-list wallet-adapter-dropdown-list-active absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-grey-100 bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
                  >
                    <li role="menuitem">
                      <button onClick={() => { setMenuOpen(false); copyAddress(); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-grey-800 transition-colors hover:bg-grey-25">
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Wallet className="h-4 w-4 text-grey-500" />}
                        {copied ? "Copied" : "Copy address"}
                      </button>
                    </li>
                    <li role="menuitem">
                      <button onClick={() => { setMenuOpen(false); setModalOpen(true); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-grey-800 transition-colors hover:bg-grey-25">
                        <Wallet className="h-4 w-4 text-grey-500" />
                        Change wallet
                      </button>
                    </li>
                    <li role="menuitem" className="border-t border-grey-100">
                      <button
                        onClick={() => { setMenuOpen(false); disconnectWallet(); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-error transition-colors hover:bg-red-50"
                      >
                        Disconnect
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="wallet-adapter-button flex h-11 cursor-pointer !items-center !justify-center rounded-lg bg-white text-xs !font-semibold text-primaryBlue shadow-[0px_0px_40px_rgba(0,_0,_0,_0.06)] transition-all duration-150 ease-in-out hover:!bg-blue-25 active:!bg-blue-50 sm:text-base w-11 pl-2 mobile:w-auto mobile:gap-2 mobile:pl-5 mobile:pr-5"
              tabIndex={0}
              type="button"
              aria-label="Connect wallet"
            >
              <i className="wallet-adapter-button-start-icon">
                <Wallet className="h-5 w-5 flex-shrink-0 text-primaryBlue" />
              </i>
              <span
                className="chakra-text hidden items-center justify-center mobile:flex"
                id="connect-wallet-button"
              >
                Connect wallet
              </span>
            </button>
          )}
        </div>
        <div className="!relative flex items-center visible">
          <button
            onClick={() => setBellOpen(o => !o)}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white shadow-[0_0_40px_rgba(0,0,0,0.06)] transition-colors hover:bg-blue-25 active:bg-blue-50 mobile:h-11 mobile:w-11"
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={bellOpen}
          >
            <Bell className="h-5 w-5 text-neutral-primary" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primaryBlue px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown
            notifications={notifications}
            show={bellOpen}
            onClose={() => setBellOpen(false)}
            onMarkAllRead={markAllNotificationsRead}
            onDelete={deleteNotification}
            onDeleteAll={deleteAllNotifications}
          />
        </div>
        <div
          onClick={() => setProfileOpen(true)}
          className="flex h-9 w-9 flex-shrink-0 !cursor-pointer items-center justify-center rounded-lg bg-white p-2 shadow-[0_0_40px_rgba(0,0,0,0.06)] hover:bg-blue-25 mobile:h-11 mobile:w-11 !w-[unset]"
        >
          <div className="!relative flex select-none items-center justify-center">
            <div className="relative mr-1 flex h-5 w-5 select-none items-center justify-center rounded-full border border-[#E0E7EB] bg-primaryBlue text-[10px] font-bold text-white mobile:mr-2 mobile:h-[30px] mobile:w-[30px] mobile:min-w-[30px] mobile:max-w-[30px]">
              {initial}
            </div>
            <div className="relative flex h-5 min-h-5 w-5 min-w-5 items-center justify-center">
              <Menu className="h-5 w-5 text-neutral-primary" />
            </div>
          </div>
        </div>
      </div>

      <ConnectWalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
}
