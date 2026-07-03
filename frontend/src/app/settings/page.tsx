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
 KeyRound, Globe, Palette, Download, Trash2, Copy, Info, Users, Plus, Network,
 ToggleRight, ToggleLeft, HelpCircle, FileText, Mail
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
 { icon: Settings, label: "Settings", active: true, href: "/settings" },
];

export default function SettingsPage() {
 const router = useRouter();
 const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
 const [address, setAddress] = useState("");
 const [loading, setLoading] = useState(true);

 // Network state
 const [activeNetwork, setActiveNetwork] = useState("testnet");

 // Recommended contacts from transaction history
 const [recommendedContacts, setRecommendedContacts] = useState<string[]>([]);

 // Address book state
 interface AddressEntry {
   name: string;
   address: string;
 }
 const [addressBook, setAddressBook] = useState<AddressEntry[]>([]);
 const [showAddForm, setShowAddForm] = useState(false);
 const [editingIndex, setEditingIndex] = useState<number | null>(null);
 const [formName, setFormName] = useState("");
 const [formAddress, setFormAddress] = useState("");

 // Mock toggle states
 const [customRpc, setCustomRpc] = useState(false);
 const [pushNotifs, setPushNotifs] = useState(true);
 const [emailNotifs, setEmailNotifs] = useState(false);
 const [txConfirm, setTxConfirm] = useState(true);

 useEffect(() => {
 const wallet = loadWallet();
 if (!wallet) {
 router.push("/wallet");
 return;
 }
 setStoredWallet(wallet);
 setAddress(wallet.publicKey);

 // Fetch recent transactions to build recommended contacts
 const pk = wallet.publicKey;
 Promise.all([
   getTransactions(pk, 30),
 ]).then(([txs]) => {
   const seen = new Set<string>();
   txs.forEach((tx: any) => {
     if (tx.from && tx.from !== pk) seen.add(tx.from);
     if (tx.to && tx.to !== pk) seen.add(tx.to);
   });
   setRecommendedContacts(Array.from(seen).slice(0, 10));
 }).catch(() => {});

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

  {/* Bottom — always visible */}
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

   <Link href="/profile" className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer group">
    <div className="flex items-center gap-3 min-w-0">
     <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
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
 <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 ">Settings</h1>
 <p className="text-sm font-medium text-slate-500 mt-1">Configure your wallet experience</p>
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
 <span className="text-white font-extrabold text-4xl">{emailName.charAt(0).toUpperCase()}</span>
 </div>
 </Link>
 </div>
 </header>

 <div className="px-8 sm:px-10 lg:px-12 py-8 flex-1 flex flex-col">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 
 {/* Left Column */}
 <div className="flex flex-col gap-8">
 
 {/* Network Preferences Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Network Preferences</h3>
 
 <div className="flex flex-col gap-3">
 {/* Network Selector */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"><Network className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Active Network</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Select the Stellar network to connect to</span>
 </div>
 </div>
 <div className="flex items-center gap-3 w-full sm:w-auto">
 <div className={`w-2.5 h-2.5 rounded-full ${activeNetwork === 'testnet' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'} shrink-0`}></div>
 <select value={activeNetwork} onChange={e => setActiveNetwork(e.target.value)} className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors appearance-none cursor-pointer outline-none">
 <option value="testnet" className="font-bold">Testnet</option>
 <option value="mainnet" className="font-bold">Mainnet</option>
 </select>
 </div>
 </div>
 
 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Custom RPC Toggle */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 " onClick={() => setCustomRpc(!customRpc)}>
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Activity className="w-6 h-6"/></div>
 <div className="flex flex-col">
  <span className="font-bold text-slate-900 text-base">Custom RPC Node</span>
  <span className="text-xs font-semibold text-slate-500 mt-0.5">Connect to a private Soroban RPC</span>
  </div>
  </div>
  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${customRpc ? 'bg-indigo-600' : 'bg-slate-200'}`}>
    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${customRpc ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
  </div>
  </div>
 </div>
 </div>

 {/* Address Book Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <div className="flex items-center justify-between mb-8">
 <h3 className="font-extrabold text-slate-900 text-2xl">Address Book</h3>
 <button onClick={() => { setShowAddForm(true); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-2">
 <Plus className="w-4 h-4"/> Add New
 </button>
 </div>
 
 <div className="flex flex-col gap-3">
 {/* Add / Edit Form */}
 {(showAddForm || editingIndex !== null) && (
   <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-3">
     <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contact name" className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
     <input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Stellar address (G...)" className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
     <div className="flex items-center gap-2">
       <button onClick={() => {
         if (!formName.trim() || !formAddress.trim()) return;
         if (editingIndex !== null) {
           const updated = [...addressBook];
           updated[editingIndex] = { name: formName.trim(), address: formAddress.trim() };
           setAddressBook(updated);
         } else {
           setAddressBook([...addressBook, { name: formName.trim(), address: formAddress.trim() }]);
         }
         setShowAddForm(false);
         setEditingIndex(null);
         setFormName("");
         setFormAddress("");
       }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
         {editingIndex !== null ? "Save" : "Add Contact"}
       </button>
       <button onClick={() => { setShowAddForm(false); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
         Cancel
       </button>
     </div>
   </div>
 )}

 {/* Recommended contacts from transaction history */}
 {recommendedContacts.length > 0 && (
   <>
     <div className="flex items-center gap-2 mt-1 mb-1">
       <div className="h-px flex-1 bg-slate-100"></div>
       <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recommended</span>
       <div className="h-px flex-1 bg-slate-100"></div>
     </div>
     {recommendedContacts.map((addr, i) => {
       const alreadySaved = addressBook.some(e => e.address === addr);
       return (
         <div key={i} className="flex items-center justify-between p-4 bg-blue-50/30 border border-blue-100/50 rounded-2xl">
           <div className="flex items-center gap-5 min-w-0">
             <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
               {addr.charAt(0)}
             </div>
             <div className="flex flex-col min-w-0">
               <span className="font-bold text-slate-900 text-base">
                 {addr.slice(0, 4)}...{addr.slice(-4)}
               </span>
               <span className="text-xs font-mono font-semibold text-slate-500 mt-0.5 truncate">{addr}</span>
             </div>
           </div>
           <div className="flex items-center gap-2 shrink-0">
             {alreadySaved ? (
               <span className="text-[11px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg">Saved</span>
             ) : (
               <button onClick={() => {
                 setAddressBook([...addressBook, { name: addr.slice(0, 8), address: addr }]);
               }} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                 <Plus className="w-3.5 h-3.5" /> Add
               </button>
             )}
             <button onClick={() => router.push(`/send?to=${addr}`)} className="p-2 text-indigo-600 hover:bg-blue-100 rounded-lg transition-colors" title="Send to this address">
               <Send className="w-4 h-4"/>
             </button>
           </div>
         </div>
       );
     })}
   </>
 )}

 {addressBook.length === 0 && !showAddForm && recommendedContacts.length === 0 && (
   <div className="flex flex-col items-center py-8 text-slate-400">
     <Users className="w-10 h-10 mb-3 opacity-50" />
     <p className="text-sm font-semibold">No saved addresses</p>
     <p className="text-xs mt-1">Add frequently-used addresses for quick access</p>
   </div>
 )}

 {addressBook.map((entry, i) => (
   <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
     <div className="flex items-center gap-5">
       <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-sm">
         {entry.name.charAt(0).toUpperCase()}
       </div>
       <div className="flex flex-col">
         <span className="font-bold text-slate-900 text-base">{entry.name}</span>
         <span className="text-xs font-mono font-semibold text-slate-500 mt-0.5">{entry.address.slice(0, 4)}...{entry.address.slice(-4)}</span>
       </div>
     </div>
     <div className="flex items-center gap-2">
       <button onClick={() => router.push(`/send?to=${entry.address}&name=${encodeURIComponent(entry.name)}`)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Send to this address">
         <Send className="w-5 h-5"/>
       </button>
       <button onClick={() => { setEditingIndex(i); setFormName(entry.name); setFormAddress(entry.address); setShowAddForm(false); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Edit this address">
         <Edit2 className="w-5 h-5"/>
       </button>
     </div>
   </div>
 ))}
 </div>
 </div>

 </div>

 {/* Right Column */}
 <div className="flex flex-col gap-8">
 
 {/* General Settings Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">General Settings</h3>
 
 <div className="flex flex-col gap-3">
 {/* Currency Display */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0"><span className="font-bold text-lg">$</span></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Base Currency</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Used for fiat value estimation</span>
 </div>
 </div>
 <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-300 transition-colors w-full sm:w-auto">
 USD ($) <ChevronDown className="w-5 h-5 text-slate-400 "/>
 </button>
 </div>
 
 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Theme */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Palette className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Appearance</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Light, Dark, or System mode</span>
 </div>
 </div>
 <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-orange-300 transition-colors w-full sm:w-auto">
 <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-slate-700"></div> System</div>
 <ChevronDown className="w-5 h-5 text-slate-400 "/>
 </button>
 </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Language */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Globe className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Language</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Interface language</span>
 </div>
 </div>
 <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 transition-colors w-full sm:w-auto">
 English <ChevronDown className="w-5 h-5 text-slate-400 "/>
 </button>
 </div>
 </div>
 </div>

 {/* Notifications Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Notifications</h3>
 
 <div className="flex flex-col gap-3">
 {/* Push */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 " onClick={() => setPushNotifs(!pushNotifs)}>
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Smartphone className="w-6 h-6"/></div>
 <div className="flex flex-col">
  <span className="font-bold text-slate-900 text-base">Push Notifications</span>
  <span className="text-xs font-semibold text-slate-500 mt-0.5">Get notified for incoming payments</span>
  </div>
  </div>
  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${pushNotifs ? 'bg-indigo-600' : 'bg-slate-200'}`}>
    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${pushNotifs ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
  </div>
  </div>
 
 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Email */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 " onClick={() => setEmailNotifs(!emailNotifs)}>
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Mail className="w-6 h-6"/></div>
 <div className="flex flex-col">
  <span className="font-bold text-slate-900 text-base">Email Summaries</span>
  <span className="text-xs font-semibold text-slate-500 mt-0.5">Weekly wallet activity reports</span>
  </div>
  </div>
  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${emailNotifs ? 'bg-indigo-600' : 'bg-slate-200'}`}>
    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${emailNotifs ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
  </div>
  </div>

 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 {/* Tx Confirm */}
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 " onClick={() => setTxConfirm(!txConfirm)}>
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><CheckCircle2 className="w-6 h-6"/></div>
 <div className="flex flex-col">
  <span className="font-bold text-slate-900 text-base">Transaction Confirmation</span>
  <span className="text-xs font-semibold text-slate-500 mt-0.5">Require review before signing</span>
  </div>
  </div>
  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${txConfirm ? 'bg-indigo-600' : 'bg-slate-200'}`}>
    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${txConfirm ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
  </div>
  </div>
 </div>
 </div>

 {/* About Atreus Card */}
 <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
 <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">About Atreus</h3>
 
 <div className="flex flex-col gap-3">
 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Info className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Version</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Atreus Wallet Web 1.0.0</span>
 </div>
 </div>
 <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold">Up to date</span>
 </div>
 
 <div className="h-px bg-slate-100 ml-20 my-1.5"></div>

 <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100 ">
 <div className="flex items-center gap-5">
 <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6"/></div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 text-base">Terms of Service</span>
 <span className="text-xs font-semibold text-slate-500 mt-0.5">Read our terms and conditions</span>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"/>
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
