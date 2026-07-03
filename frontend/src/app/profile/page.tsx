"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, getBalance, getBalances, getTransactions, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { 
 LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
 Settings, Search, Bell, ChevronDown, Send, ArrowDownToLine, RefreshCw, 
 ExternalLink, ArrowUpRight, ArrowDownLeft, Lock, PlusCircle, CheckCircle2,
 ChevronRight, Eye, ArrowRight, User, Edit2, ShieldCheck, Smartphone, Fingerprint,
 KeyRound, Globe, Palette, Download, Trash2, Copy, Info, Users
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

export default function ProfilePage() {
 const router = useRouter();
 const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
 const [address, setAddress] = useState("");
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const wallet = loadWallet();
 if (!wallet) {
 router.push("/wallet");
 return;
 }
 setStoredWallet(wallet);
 setAddress(wallet.publicKey);
 setLoading(false);
 }, [router]);

 if (loading) {
 return (
 <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
 <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
 </div>
 );
 }

 const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
 const displayAddress = address ? `${address.slice(0, 5)}...${address.slice(-4)}` : '';

 return (
 <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
 
 {/* Sidebar */}
 <aside className="w-[280px] bg-white border-r border-slate-100 hidden lg:flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-20 overflow-hidden">
  {/* Logo */}
  <div className="px-6 pt-8 pb-4 shrink-0">
   <Link href="/" className="flex items-center gap-3 px-2 cursor-pointer hover:opacity-80 transition-opacity">
    <Image src={logo} alt="Atreus" width={32} height={32} className="rounded-[10px] shadow-sm" />
    <span className="font-extrabold text-xl tracking-tight text-slate-900">Atreus</span>
   </Link>
  </div>

  {/* Nav — scrollable */}
  <nav className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-1.5 py-2">
   {navItems.map((item, i) => {
    const LinkComp = item.href ? Link : "div";
    return (
     <LinkComp key={i} href={item.href || "#"} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer'}`}>
      <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
      {item.label}
     </LinkComp>
    );
   })}
  </nav>

  {/* Bottom: Stellar info + user — always visible */}
  <div className="px-6 pb-6 pt-3 shrink-0 flex flex-col gap-3">
   <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
    <div className="flex items-center gap-2 mb-1">
     <Shield className="w-4 h-4 text-slate-400" />
     <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Built on Stellar</span>
     <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
    </div>
    <p className="text-[12px] font-medium text-slate-500 leading-snug">Fast. Low cost. Borderless payments.</p>
    <button className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 mt-2 flex items-center gap-1">Learn more <ArrowRightLeft className="w-3 h-3" /></button>
   </div>

   <Link href="/profile" className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
    <div className="flex items-center gap-3 min-w-0">
     <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm shrink-0">
      <span className="text-white font-extrabold text-base">{emailName.charAt(0).toUpperCase()}</span>
     </div>
     <div className="flex flex-col min-w-0">
      <span className="text-sm font-bold text-indigo-900 truncate">{emailName}</span>
      <span className="text-xs font-medium text-indigo-500 truncate">{displayAddress}</span>
     </div>
    </div>
    <ChevronDown className="w-4 h-4 text-indigo-400 shrink-0" />
   </Link>
  </div>
 </aside>

 {/* Main Content */}
 <main className="flex-1 flex flex-col min-w-0">
 
 {/* Top Header */}
 <header className="w-full flex items-center justify-between py-6 px-8 sm:px-10 lg:px-12 bg-[#FAFBFF] sticky top-0 z-30 backdrop-blur-md border-b border-slate-100/50">
 <div className="flex flex-col">
 <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 ">Profile</h1>
 <p className="text-sm font-medium text-slate-500 mt-1">Manage your account and wallet preferences</p>
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
 
 <button className="relative p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm ">
 <Bell className="w-6 h-6 text-slate-600 " />
 <span className="absolute top-0 right-0 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4">3</span>
 </button>
 <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm ring-4 ring-indigo-50 cursor-pointer shrink-0">
 <span className="text-white font-extrabold text-lg">{emailName.charAt(0).toUpperCase()}</span>
 </div>
 </div>
 </header>

 <div className="px-8 sm:px-10 lg:px-12 py-8 flex-1 flex flex-col">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 
 {/* Left Column */}
 <div className="flex flex-col gap-8">
 
 {/* Profile Info Card */}
 <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
   {/* Top row: avatar + name + edit button */}
   <div className="flex items-start justify-between gap-4">
     <div className="flex items-center gap-6">
       <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0 border-4 border-white">
         <span className="text-white font-extrabold text-4xl">{emailName.charAt(0).toUpperCase()}</span>
       </div>
       <div className="flex flex-col">
         <div className="flex items-center gap-2.5 mb-1">
           <h2 className="text-2xl font-extrabold text-slate-900">{emailName.charAt(0).toUpperCase() + emailName.slice(1)}</h2>
           <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-100">
             <CheckCircle2 className="w-3.5 h-3.5"/> Verified
           </span>
         </div>
         <p className="text-sm font-semibold text-slate-500">{storedWallet?.email}</p>
         <p className="text-xs font-semibold text-slate-400 mt-1">Member since July 2, 2026</p>
       </div>
     </div>
     <button className="shrink-0 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap">
       <Edit2 className="w-3.5 h-3.5"/> Edit Profile
     </button>
   </div>
   {/* Bio */}
   <p className="text-sm font-bold text-slate-700">Exploring the future of payments with Atreus 🚀</p>
 </div>

 {/* Security Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Security</h3>
 
 <div className="flex flex-col gap-3">
 {/* Recovery Phrase */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><ShieldCheck className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Recovery Phrase</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Secure your wallet recovery phrase</span>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className="bg-green-50 text-green-600 border border-green-100 px-3 py-1.5 rounded-xl text-xs font-bold">Backed up</span>
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
 </div>
 </div>
 
 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Password */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Lock className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Password</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Manage your account password</span>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
 </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Biometric */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Fingerprint className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Biometric Login</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Use biometrics to secure your account</span>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className="bg-green-50 text-green-600 border border-green-100 px-3 py-1.5 rounded-xl text-xs font-bold">Enabled</span>
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
 </div>
 </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Passkeys */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><KeyRound className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Passkeys</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Manage your passkeys</span>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className="text-indigo-600 px-3 py-1.5 text-xs font-bold">Coming Soon</span>
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
 </div>
 </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* 2FA */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Shield className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Two-Factor Authentication</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Add an extra layer of security</span>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className="text-slate-400 px-3 py-1.5 text-xs font-bold">Disabled</span>
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
 </div>
 </div>
 </div>
 </div>

 {/* Connected Accounts Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-2 text-2xl">Connected Accounts</h3>
 <p className="text-sm font-semibold text-slate-500 mb-8">Manage your connected accounts and integrations</p>
 
 <div className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center p-3">
 <svg viewBox="0 0 24 24" className="w-full h-full">
 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
 </svg>
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Google</span>
 <span className="text-xs font-semibold text-slate-500 ">{storedWallet?.email}</span>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className="bg-green-50 text-green-600 border border-green-100 px-4 py-1.5 rounded-xl text-xs font-bold">Connected</span>
 <button className="text-slate-400 hover:text-slate-600 "><Settings className="w-5 h-5"/></button>
 </div>
 </div>
 </div>

 </div>

 {/* Right Column */}
 <div className="flex flex-col gap-8">
 
 {/* Wallet Overview */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Wallet Overview</h3>
 
 <div className="flex flex-col gap-8 relative z-10">
 <div className="flex flex-col gap-2.5 items-start">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wallet Address</span>
 <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => navigator.clipboard.writeText(address)}>
 <span className="text-base font-mono font-bold text-slate-800 tracking-tight">{address.slice(0, 12)}...{address.slice(-6)}</span>
 <Copy className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />
 </div>
 </div>
 
 <div className="flex flex-col gap-2.5 items-start">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Network</span>
 <div className="flex items-center gap-3">
 <span className="text-base font-bold text-slate-700 ">Stellar Testnet</span>
 <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
 </div>
 </div>

 <div className="flex flex-col gap-2.5 items-start">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Type</span>
 <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl border border-indigo-100">
 <span className="text-sm font-bold">Standard Wallet</span>
 <Info className="w-4 h-4 opacity-80" />
 </div>
 </div>
 </div>

 {/* Decorative Faded Logo */}
 <div className="absolute -right-20 -bottom-20 w-[400px] h-[400px] opacity-[0.03] pointer-events-none transform -rotate-12">
 <Image src={stellarlogo} alt="Stellar" fill className="object-contain" />
 </div>
 </div>

 {/* Preferences Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Preferences</h3>
 
 <div className="flex flex-col gap-3">
 {/* Currency Display */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"><span className="font-bold text-lg">₹</span></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Currency Display</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Choose your preferred currency</span>
 </div>
 </div>
 <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors w-full sm:w-auto">
 INR (₹) <ChevronDown className="w-5 h-5 text-slate-400 "/>
 </button>
 </div>
 
 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Theme */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><Palette className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Theme</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Choose your preferred theme</span>
 </div>
 </div>
 <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors w-full sm:w-auto">
 <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-slate-700"></div> Light</div>
 <ChevronDown className="w-5 h-5 text-slate-400 "/>
 </button>
 </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Notifications */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Bell className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Notifications</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Manage your notification settings</span>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
 </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Language */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
 <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
 <Image src={logo} alt="Atreus" className="w-full h-full object-cover rounded-2xl" />
 </div>
 <span className="font-black text-2xl tracking-tight text-slate-900">Atreus</span>
 </Link>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Language</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Choose your preferred language</span>
 </div>
 <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors w-full sm:w-auto">
 English <ChevronDown className="w-5 h-5 text-slate-400 "/>
 </button>
 </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Default Network */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><LayoutDashboard className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Default Network</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Select default network</span>
 </div>
 </div>
 <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors w-full sm:w-auto">
 Stellar Testnet <ChevronDown className="w-5 h-5 text-slate-400 "/>
 </button>
 </div>

 </div>
 </div>

 {/* Account Actions Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Account Actions</h3>
 
 <div className="flex flex-col gap-5">
 {/* Export */}
 <div className="flex items-center justify-between p-5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-2xl transition-colors cursor-pointer group">
 <div className="flex items-center gap-5">
 <Download className="w-6 h-6 text-indigo-500 group-hover:-translate-y-0.5 transition-transform"/>
 <div className="flex flex-col">
 <span className="font-bold text-indigo-900 text-base">Export Account Data</span>
 <span className="text-xs font-semibold text-indigo-500 mt-0.5">Download your account data</span>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors"/>
 </div>
 
 {/* Delete */}
 <div className="flex items-center justify-between p-5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl transition-colors cursor-pointer group">
 <div className="flex items-center gap-5">
 <Trash2 className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform"/>
 <div className="flex flex-col">
 <span className="font-bold text-red-700 text-base">Delete Account</span>
 <span className="text-xs font-semibold text-red-500 mt-0.5">Permanently delete your account and all data</span>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors"/>
 </div>
 </div>
 </div>

 </div>
 </div>
 </div>
 </main>
 </div>
 );
}
