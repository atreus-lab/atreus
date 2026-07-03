"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, sendXLM, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { 
  Send, ArrowUpRight, User, Shield, ShieldCheck,
  CheckCircle2, ExternalLink, Loader2
} from "lucide-react";
import Link from "next/link";
import { getNavItems } from "@/constants/navigation";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

export default function SendPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState("0.00");
  const [searchOpen, setSearchOpen] = useState(false);
  
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    setMounted(true);
    const wallet = loadWallet();
    if (!wallet) {
      router.push("/wallet");
      return;
    }
    setStoredWallet(wallet);

    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) setDestination(to);

    getBalance(wallet.publicKey).then(setBalance).catch(console.error);
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

  const handleSend = async () => {
    try {
      setStatus("sending");
      setErrorMsg("");

      const wallet = loadWallet();
      if (!wallet) { router.push("/wallet"); return; }
      if (!destination.trim()) throw new Error("Enter a destination address");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");

      const bal = await getBalance(wallet.publicKey);
      if (parseFloat(bal) < parseFloat(amount) + 0.001) throw new Error("Insufficient balance");

      const hash = await sendXLM(destination.trim(), amount);
      setTxHash(hash);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Send failed");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <AppHeader title="Send XLM" subtitle="Transfer assets securely on the Stellar network" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />

        <div className="p-6 sm:p-12 max-w-4xl mx-auto w-full flex-1">
          {status === "success" ? (
            <div className="bg-white rounded-[2.5rem] p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
              
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 relative z-10 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              
              <h2 className="text-3xl font-black text-slate-900 mb-2 relative z-10">Transfer Successful</h2>
              <p className="text-slate-500 font-medium mb-10 relative z-10 max-w-sm">You have successfully sent <span className="font-bold text-slate-900">{amount} XLM</span> to the destination address.</p>
              
              <div className="flex items-center justify-center gap-4 w-full relative z-10">
                <button onClick={() => router.push("/dashboard")} className="px-8 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl font-bold transition-all hover:-translate-y-1">
                  Back to Wallet
                </button>
                <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 rounded-2xl font-bold transition-all hover:-translate-y-1 flex items-center gap-2">
                  View Explorer <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              
              {/* Send Form */}
              <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col">
                <h3 className="font-extrabold text-slate-900 mb-8 text-2xl flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Send className="w-6 h-6" /></div>
                  Transfer Details
                </h3>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Destination Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <input 
                        value={destination} 
                        onChange={e => setDestination(e.target.value)} 
                        placeholder="G..." 
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-900 font-mono text-sm transition-all outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-bold text-slate-700">Amount to Send</label>
                      <span className="text-xs font-semibold text-slate-500">Available: {parseFloat(balance).toLocaleString()} XLM</span>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-lg">$</span>
                      </div>
                      <input 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        placeholder="0.00" 
                        type="number" 
                        step="0.0000001" 
                        className="w-full pl-9 pr-24 py-4 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none" 
                      />
                      <div className="absolute inset-y-2 right-2 flex items-center bg-white border-2 border-slate-100 rounded-xl px-3 pointer-events-none">
                        <span className="text-sm font-black text-slate-700">XLM</span>
                      </div>
                    </div>
                  </div>

                  {status === "error" && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2 border border-red-100">
                      <Shield className="w-5 h-5 shrink-0" /> {errorMsg}
                    </div>
                  )}

                  <button 
                    onClick={handleSend} 
                    disabled={status === "sending" || !destination || !amount} 
                    className="w-full mt-4 py-4 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(79,70,229,0.3)] rounded-2xl font-black text-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                    {status === "sending" ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
                    ) : (
                      <><ArrowUpRight className="w-6 h-6" /> Confirm Send</>
                    )}
                  </button>
                </div>
              </div>

              {/* Info Card */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                  <svg className="absolute bottom-0 right-0 w-full h-[150px] opacity-40 mix-blend-overlay pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0 100 L0 70 Q10 80, 20 60 T40 50 T60 30 T80 40 T100 10 L100 100 Z" fill="rgba(255,255,255,0.1)" />
                  </svg>
                  
                  <h3 className="font-extrabold text-xl mb-2 relative z-10">Stellar Network</h3>
                  <p className="text-indigo-100 text-sm font-medium mb-6 relative z-10 leading-relaxed">Transfers on the Stellar network typically finalize in 3-5 seconds and cost a fraction of a cent.</p>
                  
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-indigo-100">Network Fee</span>
                      <span className="text-sm font-bold text-white">~0.00001 XLM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-indigo-100">Time</span>
                      <span className="text-sm font-bold text-white">~4 Seconds</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100/50">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 mb-2">Safety First</h3>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">Always double-check the destination address before sending. Cryptocurrency transactions are irreversible once confirmed on the blockchain.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
