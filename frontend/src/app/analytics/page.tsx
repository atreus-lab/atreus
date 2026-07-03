"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { 
 LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
 Settings, Search, Bell, ChevronDown, ArrowLeft, TrendingUp
} from "lucide-react";
import logo from "../../media/ateruslogo.jpeg";

const navItems = [
 { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
 { icon: Wallet, label: "Wallet", href: "/wallet" },
 { icon: Link2, label: "Payment Links" },
 { icon: ArrowRightLeft, label: "Swap", href: "/swap" },
 { icon: BarChart3, label: "Analytics", active: true, href: "/analytics" },
 { icon: Activity, label: "Activity", href: "/activity" },
 { icon: Shield, label: "Security", href: "/security" },
 { icon: Settings, label: "Settings", href: "/settings" },
];

export default function AnalyticsPage() {
 const router = useRouter();
 const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  const wallet = loadWallet();
  if (!wallet) { router.push("/wallet"); return; }
  setStoredWallet(wallet);
  setLoading(false);
 }, [router]);

 if (loading) {
  return (
   <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
   </div>
  );
 }

 const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
 const displayAddress = storedWallet?.publicKey ? `${storedWallet.publicKey.slice(0, 5)}...${storedWallet.publicKey.slice(-4)}` : '';

 return (
  <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
   
   {/* Sidebar */}
   <aside className="w-[280px] bg-white border-r border-slate-100 hidden lg:flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-20 overflow-hidden">
    <div className="px-6 pt-8 pb-4 shrink-0">
     <Link href="/" className="flex items-center gap-3 px-2 cursor-pointer hover:opacity-80 transition-opacity">
      <Image src={logo} alt="Atreus" width={32} height={32} className="rounded-[10px] shadow-sm" />
      <span className="font-extrabold text-xl tracking-tight text-slate-900">Atreus</span>
     </Link>
    </div>
    <nav className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-1.5 py-2">
     {navItems.map((item, i) => {
      if (item.href) {
       return (
        <Link key={i} href={item.href} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
         <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
         {item.label}
        </Link>
       );
      }
      return (
       <div key={i} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
        <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
        {item.label}
       </div>
      );
     })}
    </nav>
    <div className="px-6 pb-6 pt-3 shrink-0 flex flex-col gap-3">
     <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
      <div className="flex items-center gap-2 mb-1">
       <Shield className="w-4 h-4 text-slate-400" />
       <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Built on Stellar</span>
       <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
      </div>
      <p className="text-[12px] font-medium text-slate-500 leading-snug">Fast. Low cost. Borderless payments.</p>
     </div>
     <Link href="/profile" className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm group">
      <div className="flex items-center gap-3 min-w-0">
       <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
        {emailName.charAt(0).toUpperCase()}
       </div>
       <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold truncate">{emailName}</span>
        <span className="text-[10px] font-medium text-slate-500 truncate">{displayAddress}</span>
       </div>
      </div>
      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
     </Link>
    </div>
   </aside>

   {/* Main Content */}
   <main className="flex-1 flex flex-col min-w-0">
    <header className="w-full flex items-center justify-between py-6 px-8 sm:px-10 lg:px-12 bg-[#FAFBFF] sticky top-0 z-30 backdrop-blur-md border-b border-slate-100/50">
     <div className="flex flex-col">
      <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900">Analytics</h1>
      <p className="text-sm font-medium text-slate-500 mt-1">Track your portfolio performance and metrics</p>
     </div>
     <div className="hidden md:flex items-center gap-6">
      <div className="relative">
       <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
       <input type="text" placeholder="Search anything..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all w-64 shadow-sm" />
      </div>
      <button className="relative p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
       <Bell className="w-5 h-5 text-slate-600" />
       <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4">3</span>
      </button>
     </div>
    </header>

    <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6 pt-6">
     <div>
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
       <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
     </div>

     <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 border border-indigo-100/50 flex items-center justify-center mb-6">
       <TrendingUp className="w-10 h-10 text-indigo-400" />
      </div>
      <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Analytics Coming Soon</h3>
      <p className="text-sm text-slate-500 font-medium max-w-md">
       Track your portfolio performance, transaction history, and spending patterns with detailed charts and insights.
      </p>
     </div>
    </div>
   </main>
  </div>
 );
}
