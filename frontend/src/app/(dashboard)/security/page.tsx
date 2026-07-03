"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { CheckCircle2, Lock, ArrowLeft } from "lucide-react";
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <>
      <AppHeader title="Security" subtitle="Manage your account security and privacy settings" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content flex flex-col gap-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors" style={{ color: 'var(--accent-primary)' }}><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel flex flex-col gap-6 p-8">
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100/50 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-green-500" /></div>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.25rem' }}>Privacy Score</h3>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>Your current privacy score is <strong className="text-green-600">100%</strong>. No identity leaks detected.</p>
            </div>
          </div>
          <div className="panel flex flex-col gap-6 p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}><Lock className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} /></div>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.25rem' }}>Security Settings</h3>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>Manage your passkey, recovery phrase, and connected devices.</p>
            </div>
          </div>
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}
