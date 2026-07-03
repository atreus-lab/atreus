"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { CheckCircle2, Lock, ArrowLeft } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import { getNavItems } from "@/constants/navigation";

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
    return <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = storedWallet?.publicKey ? `${storedWallet.publicKey.slice(0, 5)}...${storedWallet.publicKey.slice(-4)}` : '';
  const navItems = getNavItems("Security");

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />
      <main className="flex-1 flex flex-col min-w-0">
        <AppHeader title="Security" subtitle="Manage your account security and privacy settings" onSearchOpen={() => setSearchOpen(true)} />
        <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6 pt-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
              <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100/50 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-green-500" /></div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Privacy Score</h3>
                <p className="text-sm text-slate-500 font-medium">Your current privacy score is <strong className="text-green-600">100%</strong>. No identity leaks detected.</p>
              </div>
            </div>
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center"><Lock className="w-8 h-8 text-indigo-500" /></div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Security Settings</h3>
                <p className="text-sm text-slate-500 font-medium">Manage your passkey, recovery phrase, and connected devices.</p>
              </div>
            </div>
          </div>
        </div>
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
      </main>
    </div>
  );
}
