"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { TrendingUp, ArrowLeft } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import { getNavItems } from "@/constants/navigation";

export default function AnalyticsPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = storedWallet?.publicKey ? `${storedWallet.publicKey.slice(0, 5)}...${storedWallet.publicKey.slice(-4)}` : '';
  const navItems = getNavItems("Analytics");

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />
      <main className="flex-1 flex flex-col min-w-0">
        <AppHeader title="Analytics" subtitle="Track your portfolio performance and metrics" onSearchOpen={() => setSearchOpen(true)} />
        <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6 pt-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link>
          </div>
          <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 border border-indigo-100/50 flex items-center justify-center mb-6"><TrendingUp className="w-10 h-10 text-indigo-400" /></div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Analytics Coming Soon</h3>
            <p className="text-sm text-slate-500 font-medium max-w-md">Track your portfolio performance, transaction history, and spending patterns with detailed charts and insights.</p>
          </div>
        </div>
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
      </main>
    </div>
  );
}
