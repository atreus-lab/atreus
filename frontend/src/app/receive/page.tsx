"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { 
  ArrowDownLeft, Copy, CheckCircle2, ShieldCheck
} from "lucide-react";
import { getNavItems } from "@/constants/navigation";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

export default function ReceivePage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const wallet = loadWallet();
    if (!wallet) {
      router.push("/wallet");
      return;
    }
    setStoredWallet(wallet);
  }, [router]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const copyToClipboard = async () => {
    if (storedWallet?.publicKey) {
      await navigator.clipboard.writeText(storedWallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) {
   return (
    <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
     <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
   );
  }

  const emailName = storedWallet?.email?.split('@')[0] || "User";
  const displayAddress = storedWallet?.publicKey ? `${storedWallet.publicKey.substring(0,5)}...${storedWallet.publicKey.substring(52)}` : '';
  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <AppHeader title="Receive Assets" subtitle="Scan the QR code or share your public address" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />

        <div className="p-6 sm:p-12 max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            
            {/* Left: QR Code Card */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              
              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 relative z-10 shadow-inner">
                <div className="bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  {storedWallet?.publicKey && (
                    <QRCode 
                      value={storedWallet.publicKey} 
                      size={240} 
                      level="Q"
                      className="rounded-lg"
                      fgColor="#0f172a"
                    />
                  )}
                </div>
              </div>
              
              <h2 className="text-xl font-extrabold text-slate-900 mb-2 relative z-10">Scan to Receive</h2>
              <p className="text-slate-500 font-medium text-sm relative z-10 max-w-xs">Ask the sender to scan this QR code with their mobile wallet to send assets to you instantly.</p>
            </div>

            {/* Right: Address Info & Actions */}
            <div className="flex flex-col gap-6">
              
              <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-12 h-12 flex items-center justify-center mb-6">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                
                <h3 className="font-extrabold text-slate-900 mb-2 text-2xl">Your Public Address</h3>
                <p className="text-slate-500 text-sm font-medium mb-6">This is your unique Stellar network address. You can share this safely with anyone to receive payments.</p>

                <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 mb-6 hover:border-indigo-100 transition-colors">
                  <p className="text-slate-900 font-mono text-sm break-all leading-relaxed font-bold">
                    {storedWallet?.publicKey}
                  </p>
                </div>

                <button 
                  onClick={copyToClipboard}
                  className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                    copied 
                      ? "bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:-translate-y-1" 
                      : "bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 hover:-translate-y-1"
                  }`}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-6 h-6" /> Copied to Clipboard!</>
                  ) : (
                    <><Copy className="w-6 h-6" /> Copy Address</>
                  )}
                </button>
              </div>

              {/* Network Warning */}
              <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100/50 flex gap-5 items-start">
                <div className="w-12 h-12 shrink-0 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-extrabold text-slate-900 mb-1">Stellar Network Only</h3>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">Please ensure the sender is sending XLM or supported assets on the Stellar network. Sending assets from other networks may result in permanent loss.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
