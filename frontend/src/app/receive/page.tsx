"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import QRCode from "react-qr-code";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { 
  LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
  Settings, Search, Bell, ChevronDown, Send, ArrowDownToLine, RefreshCw, 
  ExternalLink, ArrowUpRight, ArrowDownLeft, Lock, PlusCircle, CheckCircle2,
  ChevronRight, Eye, ArrowRight, User, Edit2, ShieldCheck, Smartphone, Fingerprint,
  KeyRound, Globe, Palette, Download, Trash2, Copy, Info, Users, Plus, Network,
  ToggleRight, ToggleLeft, HelpCircle, FileText, Mail, ArrowLeft
} from "lucide-react";
import logo from "../../media/ateruslogo.jpeg";

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

export default function ReceivePage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    const wallet = loadWallet();
    if (!wallet) {
      router.push("/wallet");
      return;
    }
    setStoredWallet(wallet);
  }, [router]);

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
              Receive Assets
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Scan the QR code or share your public address</p>
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

                <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 mb-6 group-hover:border-indigo-100 transition-colors">
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
    </div>
  );
}
