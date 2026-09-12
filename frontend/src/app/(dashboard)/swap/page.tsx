"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/providers";
import { loadWallet, getBalances, type StoredWallet } from "@/lib/wallet";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import BalanceCard from "@/components/BalanceCard";
import SwapCard from "@/components/SwapCard";

export default function SwapPage() {
  const router = useRouter();
  const { publicKey, isLoading: walletLoading } = useWallet();
  const [searchOpen, setSearchOpen] = useState(false);
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [balance, setBalance] = useState("0");

  useEffect(() => {
    if (!walletLoading && !publicKey) router.push("/wallet");
  }, [publicKey, walletLoading, router]);

  useEffect(() => {
    if (!publicKey) return;
    setStoredWallet(loadWallet());
    getBalances(publicKey).then(bals => {
      setBalances(bals);
      const native = bals.find((b: any) => b.asset_type === "native");
      setBalance(native ? native.balance : "0");
    }).catch(() => {});
  }, [publicKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (walletLoading || !publicKey) {
    return (
      <>
        <AppHeader />
        <div className="app-content flex flex-1 items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
        </div>
      </>
    );
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';

  return (
    <>
      <AppHeader />
      <div className="app-content flex justify-center py-4">
        <div className="w-full max-w-[803px] flex flex-col gap-6 pb-20">
          <BalanceCard balance={balance} showBalance={true} onToggleBalance={() => {}} emailName={emailName} publicKey={publicKey} balances={balances} compact />
          <SwapCard publicKey={publicKey} balances={balances} showBack />
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}