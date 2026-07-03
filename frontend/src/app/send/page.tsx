"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadWallet, sendXLM, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { 
  LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
  Settings, Search, Bell, ChevronDown, Send, ArrowDownToLine, RefreshCw, 
  ExternalLink, ArrowUpRight, ArrowDownLeft, Lock, PlusCircle, CheckCircle2,
  ChevronRight, Eye, ArrowRight, User, Edit2, ShieldCheck, Smartphone, Fingerprint,
  KeyRound, Globe, Palette, Download, Trash2, Copy, Info, Users, Plus, Network,
  ToggleRight, ToggleLeft, HelpCircle, FileText, Mail, ArrowLeft, Loader2
} from "lucide-react";
import logo from "../../media/ateruslogo.jpeg";
import stellarlogo from "../../media/stellarlogo.webp";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", active: false, href: "/dashboard" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Link2, label: "Payment Links" },
  { icon: ArrowRightLeft, label: "Swap", href: "/swap" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Activity, label: "Activity", href: "/activity" },
  { icon: Shield, label: "Security", href: "/security" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function SendPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState("0.00");
  
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

    // Pre-fill destination from query params (e.g. from address book)
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) setDestination(to);

    getBalance(wallet.publicKey).then(setBalance).catch(console.error);
  }, [router]);

  if (!mounted) {
   return (
    <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
     <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
   );
  }

  const emailName = storedWallet?.email?.split('@')[0] || "User";

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
      
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col hidden lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <Link href="/" className="p-8 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Image src={logo} alt="Atreus" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <span className="font-black text-2xl tracking-tight text-slate-900">Atreus</span>
        </Link>

        <nav className="flex-1 px-4 py-2 space-y-1.5">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const Component = item.href ? Link : 'div';
            return (
              <Component 
                key={idx} 
                href={item.href || '#'}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[15px] font-bold transition-all cursor-pointer ${
                  item.active 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </Component>
            );
          })}
        </nav>

        <div className="p-4 mb-4">
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Built on Stellar</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto"></div>
            </div>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed mb-3 relative z-10">
              Fast. Low cost. Borderless payments.
            </p>
            <a href="#" className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition-colors relative z-10">
              Learn more <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <Link href="/profile" className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden shrink-0">
               <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                 <span className="text-white font-extrabold text-xl">{emailName.charAt(0).toUpperCase()}</span>
               </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 truncate">{storedWallet?.email || "User"}</span>
              <span className="text-[11px] font-mono text-indigo-600 truncate">{storedWallet?.publicKey.substring(0,5)}...{storedWallet?.publicKey.substring(52)}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="sticky top-0 z-10 bg-[#FAFBFF]/80 backdrop-blur-xl border-b border-slate-100/50 px-6 sm:px-12 py-5 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Link href="/dashboard" className="text-slate-400 hover:text-indigo-600 transition-colors p-1 -ml-1 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              Send XLM
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Transfer assets securely on the Stellar network</p>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search anything..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all w-64 shadow-sm" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">⌘</span>
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">K</span>
              </div>
            </div>
            <button className="relative p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
              <Bell className="w-6 h-6 text-slate-600" />
              <span className="absolute top-0 right-0 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4">3</span>
            </button>
            <Link href="/profile" className="block w-12 h-12 rounded-full overflow-hidden shadow-sm ring-4 ring-indigo-50 cursor-pointer bg-indigo-100 hover:scale-105 transition-transform">
               <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                 <span className="text-white font-extrabold text-xl">{emailName.charAt(0).toUpperCase()}</span>
               </div>
            </Link>
          </div>
        </header>

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
    </div>
  );
}
