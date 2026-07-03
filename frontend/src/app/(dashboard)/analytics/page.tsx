"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { TrendingUp, ArrowLeft } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

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
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <>
      <AppHeader title="Analytics" subtitle="Track your portfolio performance and metrics" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content" style={{ paddingTop: '1.5rem' }}>
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors" style={{ color: 'var(--accent-primary)' }}><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link>
        </div>
        <div className="panel flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}><TrendingUp className="w-10 h-10 text-indigo-400" /></div>
          <h3 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--foreground-primary)' }}>Analytics Coming Soon</h3>
          <p className="text-sm font-medium max-w-md" style={{ color: 'var(--foreground-secondary)' }}>Track your portfolio performance, transaction history, and spending patterns with detailed charts and insights.</p>
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}
