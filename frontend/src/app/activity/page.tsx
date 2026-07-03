"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadWallet, getTransactions, type StoredWallet } from "@/lib/wallet";
import { getStoredLinks, getClaimedLinks, type StoredLink } from "@/lib/links";
import { 
 LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, 
 Settings, Search, Bell, ChevronDown, ArrowDownToLine, ArrowUpRight, ArrowDownLeft, 
 CheckCircle2, ChevronRight, ArrowLeft
} from "lucide-react";
import logo from "../../media/ateruslogo.jpeg";

const navItems = [
 { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
 { icon: Wallet, label: "Wallet", href: "/wallet" },
 { icon: Link2, label: "Payment Links" },
 { icon: ArrowRightLeft, label: "Swap", href: "/swap" },
 { icon: BarChart3, label: "Analytics", href: "/analytics" },
 { icon: Activity, label: "Activity", active: true, href: "/activity" },
 { icon: Shield, label: "Security", href: "/security" },
 { icon: Settings, label: "Settings", href: "/settings" },
];

interface ActivityItem {
 id: string;
 type: 'link_created' | 'link_claimed_by_other' | 'claimed_by_you' | 'sent' | 'received';
 description: string;
 amount: string;
 timestamp: number;
}

function buildActivityFeed(
 storedLinks: StoredLink[],
 receivedLinks: StoredLink[],
 transactions: any[],
 address: string,
): ActivityItem[] {
 const activities: ActivityItem[] = [];

 for (const link of storedLinks) {
  activities.push({
   id: `create-${link.id}`,
   type: 'link_created',
   description: `Payment link created`,
   amount: `${link.amount} XLM`,
   timestamp: link.createdAt,
  });
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

 for (const link of receivedLinks) {
  activities.push({
   id: `received-link-${link.id}`,
   type: 'claimed_by_you',
   description: `Claimed via payment link`,
   amount: `${link.amount} XLM`,
   timestamp: link.createdAt,
  });
 }

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

 return activities.sort((a, b) => b.timestamp - a.timestamp);
}

export default function ActivityPage() {
 const router = useRouter();
 const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
 const [address, setAddress] = useState("");
 const [loading, setLoading] = useState(true);
 const [storedLinks, setStoredLinks] = useState<StoredLink[]>([]);
 const [receivedLinks, setReceivedLinks] = useState<StoredLink[]>([]);
 const [transactions, setTransactions] = useState<any[]>([]);

 useEffect(() => {
 const wallet = loadWallet();
 if (!wallet) {
  router.push("/wallet");
  return;
 }
 setStoredWallet(wallet);
 const pk = wallet.publicKey;
 setAddress(pk);
 setStoredLinks(getStoredLinks());
 setReceivedLinks(getClaimedLinks());

 getTransactions(pk, 50).then((txs) => {
  setTransactions(txs);
 }).finally(() => setLoading(false));
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

 const activities = buildActivityFeed(storedLinks, receivedLinks, transactions, address);

 function renderActivityItem(item: ActivityItem) {
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
      <span className="text-[11px] font-semibold text-slate-400">
       {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
      </span>
     </div>
     <span className="text-[12px] font-semibold text-slate-500">
      {item.amount}
     </span>
    </div>
   </div>
  );
 }

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

    {/* Nav */}
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

    {/* Bottom */}
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
    
    {/* Top Header */}
    <header className="w-full flex items-center justify-between py-6 px-8 sm:px-10 lg:px-12 bg-[#FAFBFF] sticky top-0 z-30 backdrop-blur-md border-b border-slate-100/50">
     <div className="flex flex-col">
      <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900">Activity</h1>
      <p className="text-sm font-medium text-slate-500 mt-1">Your complete transaction history</p>
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

     {/* Activity Feed */}
     <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-8">
       <h3 className="font-extrabold text-slate-900 text-xl">All Activity</h3>
       <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Overview
       </Link>
      </div>

      <div className="flex flex-col gap-6 relative">
       <div className="absolute left-5 top-4 bottom-4 w-px bg-slate-100 -z-10"></div>

       {activities.length > 0 ? activities.map(renderActivityItem) : (
        <div className="flex items-start gap-4">
         <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 border-4 border-white flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4" />
         </div>
         <div className="flex flex-col flex-1 pt-1">
          <span className="font-bold text-slate-900 text-sm">No activity yet</span>
          <span className="text-[12px] font-semibold text-slate-500">Your activity will appear here.</span>
         </div>
        </div>
       )}
      </div>
     </div>

    </div>
   </main>
  </div>
 );
}
