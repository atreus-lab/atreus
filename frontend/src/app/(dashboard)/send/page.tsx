"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, sendXLM, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { 
  Send, ArrowUpRight, User, Shield, ShieldCheck,
  CheckCircle2, ExternalLink, Loader2
} from "lucide-react";
import Link from "next/link";
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
     <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
   );
  }

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
    <>
      <AppHeader title="Send XLM" subtitle="Transfer assets securely on the Stellar network" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />

      <div className="app-content max-w-4xl mx-auto">
        {status === "success" ? (
          <div className="panel flex flex-col items-center text-center relative overflow-hidden p-12">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" style={{ background: 'rgba(16,185,129,0.15)' }}></div>
            
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 relative z-10" style={{ background: 'rgba(16,185,129,0.2)', color: '#22c55e', boxShadow: '0 0 0 8px rgba(16,185,129,0.15)' }}>
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <h2 className="text-3xl font-black mb-2 relative z-10" style={{ color: 'var(--foreground-primary)' }}>Transfer Successful</h2>
            <p className="font-medium mb-10 relative z-10 max-w-sm" style={{ color: 'var(--foreground-secondary)' }}>You have successfully sent <span style={{ color: 'var(--foreground-primary)' }} className="font-bold">{amount} XLM</span> to the destination address.</p>
            
            <div className="flex items-center justify-center gap-4 w-full relative z-10">
              <button onClick={() => router.push("/dashboard")} className="btn btn-lg btn-ghost">
                Back to Wallet
              </button>
              <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="btn btn-lg" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                View Explorer <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            
            {/* Send Form */}
            <div className="panel flex flex-col lg:col-span-3 p-10">
              <h3 className="section-title flex items-center gap-3" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)', borderRadius: '0.75rem' }}><Send className="w-6 h-6" /></div>
                Transfer Details
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1" style={{ color: 'var(--foreground-secondary)' }}>Destination Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5" style={{ color: 'var(--foreground-secondary)' }} />
                    </div>
                    <input 
                      value={destination} 
                      onChange={e => setDestination(e.target.value)} 
                      placeholder="G..." 
                      className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm transition-all outline-none font-mono focus:border-indigo-500" 
                      style={{ background: 'var(--background-elevated)', border: '2px solid var(--border-default)', color: 'var(--foreground-primary)' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-bold" style={{ color: 'var(--foreground-secondary)' }}>Amount to Send</label>
                    <span className="text-xs font-semibold" style={{ color: 'var(--foreground-secondary)' }}>Available: {parseFloat(balance).toLocaleString()} XLM</span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="font-bold text-lg" style={{ color: 'var(--foreground-secondary)' }}>$</span>
                    </div>
                    <input 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      type="number" 
                      step="0.0000001" 
                      className="w-full pl-9 pr-24 py-4 rounded-2xl text-lg transition-all outline-none font-bold focus:border-indigo-500" 
                      style={{ background: 'var(--background-elevated)', border: '2px solid var(--border-default)', color: 'var(--foreground-primary)' }}
                    />
                    <div className="absolute inset-y-2 right-2 flex items-center rounded-xl px-3 pointer-events-none" style={{ background: 'var(--background-card)', border: '2px solid var(--border-default)', borderRadius: '0.75rem' }}>
                      <span className="text-sm font-black" style={{ color: 'var(--foreground-primary)' }}>XLM</span>
                    </div>
                  </div>
                </div>

                {status === "error" && (
                  <div className="p-4 rounded-2xl text-sm font-bold flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                    <Shield className="w-5 h-5 shrink-0" /> {errorMsg}
                  </div>
                )}

                <button 
                  onClick={handleSend} 
                  disabled={status === "sending" || !destination || !amount} 
                  className="w-full mt-4 py-4 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                  style={{ background: 'var(--accent-primary)', color: 'white' }}
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

              <div className="rounded-[2.5rem] p-8" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="w-12 h-12 flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.2)', color: '#d97706', borderRadius: '1rem' }}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold mb-2" style={{ color: 'var(--foreground-primary)' }}>Safety First</h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>Always double-check the destination address before sending. Cryptocurrency transactions are irreversible once confirmed on the blockchain.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
