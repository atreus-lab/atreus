"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { TrendingUp } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import EmptyState from "@/components/ui/EmptyState";

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

  return (
    <>
      <AppHeader title="Analytics" subtitle="Track your portfolio performance and metrics" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="panel">
            <EmptyState
              icon={<TrendingUp className="w-6 h-6" />}
              title="Analytics Coming Soon"
              description="Track your portfolio performance, transaction history, and spending patterns with detailed charts and insights."
            />
          </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}
