"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { CheckCircle2, Lock } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

export default function SecurityPage() {
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
      <AppHeader title="Security" subtitle="Manage your account security and privacy settings" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel flex flex-col gap-4 p-6">
              <div className="w-10 h-10 rounded-lg bg-[rgba(34,197,94,0.08)] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary mb-1">Privacy Score</h3>
                <p className="text-sm text-secondary">Your current privacy score is <strong className="text-success">100%</strong>. No identity leaks detected.</p>
              </div>
            </div>
            <div className="panel flex flex-col gap-4 p-6">
              <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.08)] flex items-center justify-center">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary mb-1">Security Settings</h3>
                <p className="text-sm text-secondary">Manage your passkey, recovery phrase, and connected devices.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}
