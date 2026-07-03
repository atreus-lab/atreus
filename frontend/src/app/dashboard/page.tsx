"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, getBalance, getBalances, getTransactions, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { getStoredLinks, refreshLinkStatuses, updateLinkStatus, getClaimedLinks, type StoredLink } from "@/lib/links";
import { 
 LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
 Settings, Search, Bell, ChevronDown, Send, ArrowDownToLine, RefreshCw, 
 ExternalLink, ArrowUpRight, ArrowDownLeft, Lock, PlusCircle, CheckCircle2,
 ChevronRight, Eye, EyeOff, ArrowRight, X, Copy, Check, Menu
} from "lucide-react";
import logo from "../../media/ateruslogo.jpeg";
import shieldImg from "../../media/Shield1.png";
import stellarlogo from "../../media/stellarlogo.webp";

const scrollToLinks = () => {
 const el = document.getElementById("my-links-section");
 if (el) el.scrollIntoView({ behavior: "smooth" });
};

const navItems = [
 { icon: LayoutDashboard, label: "Overview", active: true, href: "/dashboard" },
 { icon: Wallet, label: "Wallet", href: "/wallet" },
 { icon: Link2, label: "Payment Links", onClick: scrollToLinks },
 { icon: ArrowRightLeft, label: "Swap", href: "/swap" },
 { icon: BarChart3, label: "Analytics", href: "/analytics" },
 { icon: Activity, label: "Activity", href: "/activity" },
 { icon: Shield, label: "Security", href: "/security" },
 { icon: Settings, label: "Settings", href: "/settings" },
];

export default function DashboardPage() {
 const router = useRouter();
 const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
 const [address, setAddress] = useState("");
 const [balance, setBalance] = useState("0");
 const [balances, setBalances] = useState<any[]>([]);
 const [transactions, setTransactions] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [claimLinkInput, setClaimLinkInput] = useState("");
 const [showClaimModal, setShowClaimModal] = useState(false);
 const [storedLinks, setStoredLinks] = useState<StoredLink[]>([]);
 const [receivedLinks, setReceivedLinks] = useState<StoredLink[]>([]);
 const [copiedLinkId, setCopiedLinkId] = useState("");
 const [showBalance, setShowBalance] = useState(true);
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

 const loadData = useCallback(async (addr: string) => {
 try {
 const [bal, bals, txs] = await Promise.all([
 getBalance(addr),
 getBalances(addr),
 getTransactions(addr, 5),
 ]);
 setBalance(bal);
 setBalances(bals);
 setTransactions(txs);
 } catch (err: any) {
 console.error(err);
 }
 }, []);

 const copyLink = (url: string, id: string) => {
  navigator.clipboard.writeText(url);
  setCopiedLinkId(id);
  setTimeout(() => setCopiedLinkId(""), 2000);
 };

 const markAsClaimed = (secretHex: string) => {
  updateLinkStatus(secretHex, true);
  setStoredLinks(getStoredLinks());
 };

 const handleClaimLink = () => {
  const link = claimLinkInput.trim();
  if (!link) return;
  setShowClaimModal(false);
  setClaimLinkInput("");
  window.location.href = link;
 };

 // Auto-refresh after a claim (claimed timestamp set in localStorage)
 useEffect(() => {
  const claimed = localStorage.getItem("atreus_claimed");
  if (claimed && address) {
   loadData(address);
  }
 }, [address, loadData]);

 // Body scroll lock when mobile drawer is open
 useEffect(() => {
  if (mobileMenuOpen) {
   document.body.style.overflow = 'hidden';
  } else {
   document.body.style.overflow = '';
  }
  return () => { document.body.style.overflow = ''; };
 }, [mobileMenuOpen]);

 useEffect(() => {
 const wallet = loadWallet();
 if (!wallet) {
 router.push("/wallet");
 return;
 }
 setStoredWallet(wallet);
 const pk = wallet.publicKey;
 setAddress(pk);
 setLoading(true);
 setStoredLinks(getStoredLinks());
 setReceivedLinks(getClaimedLinks());
 loadData(pk).finally(() => setLoading(false));
 refreshLinkStatuses().then(() => {
   setStoredLinks(getStoredLinks());
   setReceivedLinks(getClaimedLinks());
  });
 }, [loadData, router]);

 if (loading) {
 return (
 <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center">
 <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
 </div>
 );
 }

 const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
 const displayAddress = address ? `${address.slice(0, 5)}...${address.slice(-4)}` : '';

 return (
 <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-blue-100">
 
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
     if (item.href) {
      return (
       <Link key={i} href={item.href} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
        <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
        {item.label}
       </Link>
      );
     }
     return (
      <div key={i} onClick={item.onClick} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
       <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
       {item.label}
      </div>
     );
   })}
  </nav>

  {/* Bottom — always visible */}
  <div className="px-6 pb-6 pt-3 shrink-0 flex flex-col gap-3">
   <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
    <div className="flex items-center gap-2 mb-1">
     <Shield className="w-4 h-4 text-slate-400" />
     <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Built on Stellar</span>
     <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
    </div>
    <p className="text-[12px] font-medium text-slate-500 leading-snug">Fast. Low cost. Borderless payments.</p>
    <button className="text-[12px] font-bold text-blue-600 hover:text-blue-700 mt-2 flex items-center gap-1">Learn more <ArrowRightLeft className="w-3 h-3" /></button>
   </div>

   <Link href="/profile" className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm group">
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
 
 {/* Top Header */}
 <header className="w-full flex items-center justify-between py-6 px-8 sm:px-10 lg:px-12 bg-[#FAFBFF] sticky top-0 z-30 backdrop-blur-md border-b border-slate-100/50">
 <div className="flex flex-col">
 <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">Good afternoon, {emailName} <span className="inline-block animate-wave">👋</span></h1>
 <p className="text-sm font-medium text-slate-500 mt-1">Here's what's happening with your wallet today.</p>
 </div>
 <div className="hidden md:flex items-center gap-6">
 <div className="relative">
 <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
 <input type="text" placeholder="Search anything..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all w-64 shadow-sm" />
 <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
 <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">⌘</span>
 <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">K</span>
 </div>
 </div>
 
 <button className="relative p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm ">
 <Bell className="w-5 h-5 text-slate-600 " />
 <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4">3</span>
 </button>
 </div>
 <div className="flex items-center gap-2 lg:hidden">
 <button className="relative p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
 <Bell className="w-5 h-5 text-slate-600" />
 <span className="absolute top-0 right-0 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4">3</span>
 </button>
 <button onClick={() => setMobileMenuOpen(true)} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
 <Menu className="w-5 h-5 text-slate-600" />
 </button>
 </div>
 </header>

 <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6">
 
 {/* Top Row */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* Balance Card (Claymorphism/Glass) */}
 <div className="lg:col-span-2 relative bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-[0_20px_40px_-15px_rgba(79,70,229,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col justify-between min-h-[300px]">
 
 {/* Background Chart decoration */}
 <svg className="absolute bottom-16 left-0 w-full h-[150px] opacity-40 mix-blend-overlay pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
 <path d="M0 100 L0 70 Q10 80, 20 60 T40 50 T60 30 T80 40 T100 10 L100 100 Z" fill="rgba(255,255,255,0.1)" />
 <path d="M0 70 Q10 80, 20 60 T40 50 T60 30 T80 40 T100 10" fill="none" stroke="white" strokeWidth="1.5" />
 <circle cx="100" cy="10" r="2" fill="white" />
 </svg>

 <div className="flex items-start justify-between relative z-10">
 <div className="flex flex-col">
 <div className="flex items-center gap-2 mb-2 text-blue-100 font-semibold text-sm">
 Total Balance <button onClick={() => setShowBalance(!showBalance)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
   {showBalance ? <Eye className="w-4 h-4 opacity-70" /> : <EyeOff className="w-4 h-4 opacity-70" />}
  </button>
 </div>
 <div className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
 {showBalance ? parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '********'} <span className="text-2xl font-bold opacity-80">XLM</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="bg-white/20 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-white/20">
 <ArrowUpRight className="w-3 h-3" /> 7.07%
 </span>
 <span className="text-sm font-semibold text-blue-100">+$660.00 today</span>
 </div>
 </div>
 <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
 1D <ChevronDown className="w-3 h-3" />
 </button>
 </div>

 <div className="flex flex-wrap items-center gap-3 relative z-10 mt-12">
 <Link href="/send" className="flex-1 min-w-[120px] bg-white text-blue-700 hover:bg-slate-50 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5">
 <ArrowUpRight className="w-4 h-4 text-blue-500" /> Send
 </Link>
 <Link href="/receive" className="flex-1 min-w-[120px] bg-white text-blue-700 hover:bg-slate-50 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5">
 <ArrowDownLeft className="w-4 h-4 text-blue-500" /> Receive
 </Link>
 <Link href="/create" className="flex-1 min-w-[120px] bg-white text-blue-700 hover:bg-slate-50 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5">
 <Link2 className="w-4 h-4 text-blue-500" /> Create Link
 </Link>
  <button onClick={() => setShowClaimModal(true)} className="flex-1 min-w-[120px] bg-white text-blue-700 hover:bg-slate-50 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5">
   <PlusCircle className="w-4 h-4 text-blue-500" /> Claim Link
  </button>
 </div>
 </div>

 {/* Privacy Score Card */}
 <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden h-full">
 <div className="flex items-center justify-between mb-8 z-10">
 <h3 className="font-extrabold text-slate-800 flex items-center gap-2">Privacy Score <Shield className="w-4 h-4 text-slate-400 " /></h3>
 <ChevronDown className="w-4 h-4 text-slate-400 cursor-pointer" />
 </div>
 
 <div className="flex items-center gap-6 z-10">
 <div className="relative w-24 h-24 shrink-0">
 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
 <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="12" />
 <circle cx="50" cy="50" r="40" fill="none" stroke="#4F46E5" strokeWidth="12" strokeDasharray="251" strokeDashoffset="0" strokeLinecap="round" className="animate-[dash_1.5s_ease-out_forwards]" />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
 <Shield className="w-8 h-8 fill-indigo-100" />
 </div>
 </div>
 <div className="flex flex-col">
 <span className="text-green-500 font-bold text-sm mb-1">Excellent</span>
 <span className="text-4xl font-black text-slate-900 tracking-tight">100%</span>
 <span className="text-[11px] font-semibold text-slate-500 mt-1 leading-snug">You're doing great!<br/>No identity leaks detected.</span>
 </div>
 </div>

 <button className="mt-auto self-start text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 z-10">
 View details <ArrowRight className="w-4 h-4" />
 </button>

 {/* Decorative Shield Image */}
 <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-48 h-48 opacity-20 pointer-events-none mix-blend-multiply">
 <Image src={shieldImg} alt="Shield" fill className="object-contain drop-shadow-xl" />
 </div>
 </div>
 </div>

 {/* Middle Row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
 {/* Assets List — split into My Assets + Available */}
 <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <div className="flex items-center justify-between mb-6">
 <h3 className="font-extrabold text-slate-900 ">Assets</h3>
 <Link href="/assets" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View all</Link>
 </div>

 {/* My Assets — only assets with non-zero balance */}
 <div className="flex flex-col gap-3 mb-4">
  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">My Assets</h4>
  {(() => {
   const myAssets = balances.filter((b: any) => b.asset_type === 'native' || b.asset_code);
   if (myAssets.length === 0) {
    return <div className="text-xs text-slate-400 italic py-2">No assets activated yet</div>;
   }
   return myAssets.slice(0, 3).map((b: any, i: number) => {
    const isNative = b.asset_type === "native";
    const code = isNative ? "XLM" : b.asset_code;
    const balanceVal = parseFloat(b.balance);
    let logoContent = null;
    if (isNative || code === 'XLM') {
     logoContent = <Image src={stellarlogo} alt="XLM" width={28} height={28} className="w-full h-full object-contain rounded-full bg-black p-0.5" />;
    } else if (code === 'USDC') {
     logoContent = <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />;
    } else if (code === 'EURT') {
     logoContent = <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">€</div>;
    } else {
     logoContent = <div className="w-full h-full bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px]">{code?.slice(0, 2)}</div>;
    }
    return (
     <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/30 border border-slate-100/60">
      <div className="flex items-center gap-3">
       <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">
        {logoContent}
       </div>
       <span className="font-bold text-slate-900 text-sm">{code}</span>
      </div>
      <span className="font-bold text-slate-900 text-sm">{balanceVal.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
     </div>
    );
   });
  })()}
 </div>

 <div className="h-px bg-slate-100 my-2"></div>

 {/* Available Assets — popular tokens to activate */}
 {(() => {
  const existingCodes = balances.map((b: any) => b.asset_code).filter(Boolean);
  const allAvailable = [
   { code: 'USDC', name: 'USD Coin' },
   { code: 'EURT', name: 'Euro Token' },
   { code: 'yUSDC', name: 'Your USDC' },
  ];
  const available = allAvailable.filter(a => !existingCodes.includes(a.code));
  if (available.length === 0) return null;
  return (
   <div className="flex flex-col gap-3 mb-2">
    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pt-2">Available</h4>
    {available.map((asset, i) => (
     <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/30 border border-slate-100/60">
      <div className="flex items-center gap-3">
       <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-sm">
        {asset.code === 'USDC' ? (
         <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=029" alt="USDC" className="w-full h-full object-contain p-1" />
        ) : asset.code === 'EURT' ? (
         <div className="w-full h-full bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-[10px]">€</div>
        ) : (
         <div className="w-full h-full bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-[10px]">{asset.code.slice(0, 3)}</div>
        )}
       </div>
       <div className="flex flex-col">
        <span className="font-bold text-slate-900 text-sm">{asset.code}</span>
        <span className="text-[10px] text-slate-400">{asset.name}</span>
       </div>
      </div>
      <Link href="/assets" className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
       Activate
      </Link>
     </div>
    ))}
   </div>
  );
 })()}

 <Link href="/assets" className="mt-4 self-start text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
  Manage assets <ArrowRight className="w-4 h-4" />
 </Link>
 </div>

 {/* Recent Activity — unified feed */}
 <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <div className="flex items-center justify-between mb-8">
 <h3 className="font-extrabold text-slate-900 ">Recent Activity</h3>
 <Link href="/activity" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View all</Link>
 </div>
 
 <div className="flex flex-col gap-6 relative">
 <div className="absolute left-5 top-4 bottom-4 w-px bg-slate-100 -z-10"></div>
 
 {(() => {
  interface ActivityItem {
   id: string;
   type: 'link_created' | 'link_claimed_by_other' | 'claimed_by_you' | 'sent' | 'received';
   description: string;
   amount: string;
   timestamp: number;
  }

  const activities: ActivityItem[] = [];

  // 1. Links created (pending + claimed)
  for (const link of storedLinks) {
   activities.push({
    id: `create-${link.id}`,
    type: 'link_created',
    description: `Payment link created`,
    amount: `${link.amount} XLM`,
    timestamp: link.createdAt,
   });
   // If it's been claimed by someone, add a claimed event
   if (link.claimed) {
    activities.push({
     id: `claimed-${link.id}`,
     type: 'link_claimed_by_other',
     description: `Link claimed by recipient`,
     amount: `${link.amount} XLM`,
     timestamp: link.createdAt,
    });
   }
  }

  // 2. Links claimed by you (as recipient)
  for (const link of receivedLinks) {
   activities.push({
    id: `received-link-${link.id}`,
    type: 'claimed_by_you',
    description: `Claimed via payment link`,
    amount: `${link.amount} XLM`,
    timestamp: link.createdAt,
   });
  }

  // 3. Stellar transactions (send/receive)
  for (const tx of transactions) {
   const isSend = tx.from === address;
   activities.push({
    id: `tx-${tx.id}`,
    type: isSend ? 'sent' : 'received',
    description: isSend ? `Sent to ${tx.to?.slice(0, 6)}...` : `Received from ${tx.from?.slice(0, 6)}...`,
    amount: `${isSend ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)} ${tx.asset_code || "XLM"}`,
    timestamp: new Date(tx.created_at).getTime(),
   });
  }

  // Sort by timestamp descending, take top 7
  const sorted = activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);

  if (sorted.length === 0) {
   return (
    <div className="flex items-start gap-4">
     <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 border-4 border-white flex items-center justify-center shrink-0">
      <Activity className="w-4 h-4" />
     </div>
     <div className="flex flex-col flex-1 pt-1">
      <span className="font-bold text-slate-900 text-sm">No recent activity</span>
      <span className="text-[12px] font-semibold text-slate-500 ">Your activity will appear here.</span>
     </div>
    </div>
   );
  }

  return sorted.map((item) => {
   let iconColor: string;
   let IconComponent: any;

   switch (item.type) {
    case 'link_created':
     IconComponent = Link2;
     iconColor = 'bg-purple-50 text-purple-500';
     break;
    case 'link_claimed_by_other':
     IconComponent = CheckCircle2;
     iconColor = 'bg-green-50 text-green-500';
     break;
    case 'claimed_by_you':
     IconComponent = ArrowDownToLine;
     iconColor = 'bg-blue-50 text-blue-500';
     break;
    case 'sent':
     IconComponent = ArrowUpRight;
     iconColor = 'bg-orange-50 text-orange-500';
     break;
    case 'received':
     IconComponent = ArrowDownLeft;
     iconColor = 'bg-green-50 text-green-500';
     break;
    default:
     IconComponent = Activity;
     iconColor = 'bg-slate-50 text-slate-400';
   }

   return (
    <div key={item.id} className="flex items-start gap-4 group">
     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white ${iconColor}`}>
      <IconComponent className="w-4 h-4" />
     </div>
     <div className="flex flex-col flex-1 pt-1">
      <div className="flex items-center justify-between">
       <span className="font-bold text-slate-900 text-sm">{item.description}</span>
       <span className="text-[11px] font-semibold text-slate-400 ">
        {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
       </span>
      </div>
      <span className="text-[12px] font-semibold text-slate-500">
       {item.amount}
      </span>
     </div>
    </div>
   );
  });
 })()}
 </div>
 </div>
 </div>

  {/* My Links — separate Pending and Claimed sections */}
  {storedLinks.length > 0 && (
   <div id="my-links-section" className="space-y-6">
    
    {/* Pending Links */}
    {(() => {
     const pending = storedLinks.filter(l => !l.claimed);
     if (pending.length === 0) return null;
     return (
      <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100">
       <div className="flex items-center justify-between mb-6">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
         Pending Links
        </h3>
        <span className="text-xs font-bold text-slate-400">{pending.length} active</span>
       </div>
       <div className="flex flex-col gap-3">
            {pending.slice(0, 5).map((link) => (
         <div key={link.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-100/60">
          <div className="flex flex-col min-w-0 flex-1 mr-3">
           <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{link.amount} XLM</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
             Pending
            </span>
           </div>
           <span className="text-[10px] text-slate-400 mt-0.5">{new Date(link.createdAt).toLocaleDateString()} {new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-1.5">
           <button
            onClick={() => markAsClaimed(link.secretHex)}
            className="p-2 rounded-lg bg-white border border-green-200 hover:bg-green-50 hover:border-green-300 transition-colors shrink-0 group"
            title="Mark as claimed"
           >
            <CheckCircle2 className="w-4 h-4 text-green-400 group-hover:text-green-600" />
           </button>
           <button
            onClick={() => copyLink(link.url, link.id)}
            className="p-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-colors shrink-0"
            title="Copy link"
           >
            {copiedLinkId === link.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-amber-500" />}
           </button>
          </div>
         </div>
        ))}
       </div>
      </div>
     );
    })()}

    {/* Claimed Links (created by you) */}
    {(() => {
     const claimed = storedLinks.filter(l => l.claimed);
     if (claimed.length === 0) return null;
     return (
      <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100">
       <div className="flex items-center justify-between mb-6">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
         <CheckCircle2 className="w-5 h-5 text-green-500" />
         Claimed (Created by You)
        </h3>
        <span className="text-xs font-bold text-green-500">{claimed.length} total</span>
       </div>
       <div className="flex flex-col gap-3">
        {claimed.slice(0, 5).map((link) => (
         <div key={link.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50/30 border border-green-100/60">
          <div className="flex flex-col min-w-0 flex-1 mr-3">
           <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{link.amount} XLM</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center gap-1">
             <CheckCircle2 className="w-3 h-3" /> Claimed
            </span>
           </div>
           <span className="text-[10px] text-slate-400 mt-0.5">{link.createdAt ? new Date(link.createdAt).toLocaleDateString() : ''} {link.createdAt ? new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
           {link.txHash && (
            <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">TX: {link.txHash.slice(0, 16)}...</span>
             <button
              onClick={() => copyLink(link.txHash!, `tx-${link.id}`)}
              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
              title="Copy transaction hash"
             >
              {copiedLinkId === `tx-${link.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
             </button>
            </div>
           )}
          </div>
         </div>
        ))}
       </div>
      </div>
     );
    })()}

   </div>
  )}

  {/* Links You've Claimed (as recipient) — shown independently even if user has no created links */}
  {receivedLinks.length > 0 && (
   <div id="received-links-section" className="space-y-6">
    {(() => {
     return (
      <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100">
       <div className="flex items-center justify-between mb-6">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
         <ArrowDownToLine className="w-5 h-5 text-blue-500" />
         Links You&apos;ve Claimed
        </h3>
        <span className="text-xs font-bold text-blue-500">{receivedLinks.length} total</span>
       </div>
       <div className="flex flex-col gap-3">
        {receivedLinks.slice(0, 5).map((link) => (
         <div key={link.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/30 border border-blue-100/60">
          <div className="flex flex-col min-w-0 flex-1 mr-3">
           <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{link.amount} XLM</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
             <ArrowDownToLine className="w-3 h-3" /> Received
            </span>
           </div>
           <span className="text-[10px] text-slate-400 mt-0.5">{new Date(link.createdAt).toLocaleDateString()} {new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
           {link.txHash && (
            <div className="flex items-center gap-1 mt-1">
             <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">TX: {link.txHash.slice(0, 16)}...</span>
             <button
              onClick={() => copyLink(link.txHash!, `rx-${link.id}`)}
              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
              title="Copy transaction hash"
             >
              {copiedLinkId === `rx-${link.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
             </button>
            </div>
           )}
          </div>
         </div>
        ))}
       </div>
      </div>
     );
    })()}
   </div>
  )}

  {/* Quick Actions Footer */}
 <div className="mt-4">
 <h3 className="font-extrabold text-slate-900 mb-1">Quick Actions</h3>
 <p className="text-[12px] font-semibold text-slate-500 mb-4">Do more with Atreus</p>
 <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
 <Link href="/send" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-indigo-100 transition-all group">
 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
 <Send className="w-5 h-5" />
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-extrabold text-slate-900 ">Send Payment</span>
 <span className="text-[10px] font-bold text-slate-400 ">Send crypto or tokens</span>
 </div>
 </Link>
 <Link href="/receive" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-blue-100 transition-all group">
 <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
 <ArrowDownToLine className="w-5 h-5" />
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-extrabold text-slate-900 ">Receive Payment</span>
 <span className="text-[10px] font-bold text-slate-400 ">Receive crypto or tokens</span>
 </div>
 </Link>
  <Link href="/create" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-purple-100 transition-all group">
   <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
    <Link2 className="w-5 h-5" />
   </div>
   <div className="flex flex-col">
    <span className="text-sm font-extrabold text-slate-900 ">Create Payment Link</span>
    <span className="text-[10px] font-bold text-slate-400 ">Create rules & share</span>
   </div>
  </Link>
  <button onClick={() => setShowClaimModal(true)} className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-purple-100 transition-all group text-left">
   <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
    <PlusCircle className="w-5 h-5" />
   </div>
   <div className="flex flex-col">
    <span className="text-sm font-extrabold text-slate-900 ">Claim Payment Link</span>
    <span className="text-[10px] font-bold text-slate-400 ">Claim funds from a link</span>
   </div>
  </button>
 <Link href="/swap" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-emerald-100 transition-all group">
 <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
 <RefreshCw className="w-5 h-5" />
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-extrabold text-slate-900 ">Swap Tokens</span>
 <span className="text-[10px] font-bold text-slate-400 ">Instant token swaps</span>
 </div>
 </Link>
 </div>
 </div>

  {/* Claim Link Modal */}
  {showClaimModal && (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 w-full max-w-md mx-4 space-y-5">
     <div className="flex items-center justify-between">
      <h3 className="text-lg font-extrabold text-slate-900">Claim a Payment Link</h3>
      <button onClick={() => { setShowClaimModal(false); setClaimLinkInput(""); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
       <X className="w-5 h-5 text-slate-400" />
      </button>
     </div>
     <p className="text-sm text-slate-500">Paste the payment link you received to claim the funds.</p>
     <input
      type="text"
      value={claimLinkInput}
      onChange={(e) => setClaimLinkInput(e.target.value)}
      placeholder="https://localhost:3000/claim#..."
      className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
     />
     <div className="flex gap-3">
      <button onClick={() => { setShowClaimModal(false); setClaimLinkInput(""); }} className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
       Cancel
      </button>
      <button onClick={handleClaimLink} disabled={!claimLinkInput.trim()} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
       Open Claim Page
      </button>
     </div>
    </div>
   </div>
  )}

  </div>
  </main>

  {/* Mobile Drawer */}
  {mobileMenuOpen && (
   <div className="fixed inset-0 z-50 lg:hidden">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
    {/* Drawer */}
    <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col animate-slide-in">
     {/* Drawer Header */}
     <div className="px-6 pt-8 pb-4 shrink-0 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 px-2" onClick={() => setMobileMenuOpen(false)}>
       <Image src={logo} alt="Atreus" width={32} height={32} className="rounded-[10px] shadow-sm" />
       <span className="font-extrabold text-xl tracking-tight text-slate-900">Atreus</span>
      </Link>
      <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
       <X className="w-5 h-5 text-slate-400" />
      </button>
     </div>

     {/* Nav Items */}
     <nav className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-1.5 py-2">
      {navItems.map((item, i) => {
       if (item.href) {
        return (
         <Link key={i} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
          <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
          {item.label}
         </Link>
        );
       }
       return (
        <div key={i} onClick={() => { item.onClick?.(); setMobileMenuOpen(false); }} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
         <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
         {item.label}
        </div>
       );
      })}
     </nav>

     {/* Bottom Section */}
     <div className="px-6 pb-6 pt-3 shrink-0 flex flex-col gap-3">
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
       <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-slate-400" />
        <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Built on Stellar</span>
        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
       </div>
       <p className="text-[12px] font-medium text-slate-500 leading-snug">Fast. Low cost. Borderless payments.</p>
      </div>

      <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm group">
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
    </div>
   </div>
  )}
  </div>
  );
 }
