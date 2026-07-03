"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getTransactions, type StoredWallet } from "@/lib/wallet";
import { getStoredLinks, getClaimedLinks, type StoredLink } from "@/lib/links";
import { Activity as ActivityIcon, Link2, ArrowDownToLine, ArrowUpRight, ArrowDownLeft, CheckCircle2, ArrowLeft } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import { getNavItems } from "@/constants/navigation";

interface ActivityItem {
  id: string;
  type: 'link_created' | 'link_claimed_by_other' | 'claimed_by_you' | 'sent' | 'received';
  description: string;
  amount: string;
  timestamp: number;
}

function buildActivityFeed(storedLinks: StoredLink[], receivedLinks: StoredLink[], transactions: any[], address: string): ActivityItem[] {
  const activities: ActivityItem[] = [];
  for (const link of storedLinks) {
    activities.push({ id: `create-${link.id}`, type: 'link_created', description: 'Payment link created', amount: `${link.amount} XLM`, timestamp: link.createdAt });
    if (link.claimed) activities.push({ id: `claimed-${link.id}`, type: 'link_claimed_by_other', description: 'Link claimed by recipient', amount: `${link.amount} XLM`, timestamp: link.createdAt });
  }
  for (const link of receivedLinks) {
    activities.push({ id: `received-link-${link.id}`, type: 'claimed_by_you', description: 'Claimed via payment link', amount: `${link.amount} XLM`, timestamp: link.createdAt });
  }
  for (const tx of transactions) {
    const isSend = tx.from === address;
    activities.push({ id: `tx-${tx.id}`, type: isSend ? 'sent' : 'received', description: isSend ? `Sent to ${tx.to?.slice(0, 6)}...` : `Received from ${tx.from?.slice(0, 6)}...`, amount: `${isSend ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)} ${tx.asset_code || "XLM"}`, timestamp: new Date(tx.created_at).getTime() });
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
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    const pk = wallet.publicKey;
    setAddress(pk);
    setStoredLinks(getStoredLinks());
    setReceivedLinks(getClaimedLinks());
    getTransactions(pk, 50).then((txs) => { setTransactions(txs); }).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = address ? `${address.slice(0, 5)}...${address.slice(-4)}` : '';
  const navItems = getNavItems("Activity");
  const activities = buildActivityFeed(storedLinks, receivedLinks, transactions, address);

  function renderActivityItem(item: ActivityItem) {
    let iconColor: string;
    let IconComponent: any;
    switch (item.type) {
      case 'link_created': IconComponent = Link2; iconColor = 'bg-purple-50 text-purple-500'; break;
      case 'link_claimed_by_other': IconComponent = CheckCircle2; iconColor = 'bg-green-50 text-green-500'; break;
      case 'claimed_by_you': IconComponent = ArrowDownToLine; iconColor = 'bg-blue-50 text-blue-500'; break;
      case 'sent': IconComponent = ArrowUpRight; iconColor = 'bg-orange-50 text-orange-500'; break;
      case 'received': IconComponent = ArrowDownLeft; iconColor = 'bg-green-50 text-green-500'; break;
      default: IconComponent = ActivityIcon; iconColor = 'bg-slate-50 text-slate-400';
    }
    return (
      <div key={item.id} className="flex items-start gap-4 group">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white ${iconColor}`}><IconComponent className="w-4 h-4" /></div>
        <div className="flex flex-col flex-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{item.description}</span>
            <span className="text-[11px] font-semibold text-slate-400">{new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
          <span className="text-[12px] font-semibold text-slate-500">{item.amount}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />
      <main className="flex-1 flex flex-col min-w-0">
        <AppHeader title="Activity" subtitle="Your complete transaction history" onSearchOpen={() => setSearchOpen(true)} />
        <div className="px-8 sm:px-10 lg:px-12 pb-12 flex-1 flex flex-col gap-6 pt-6">
          <div className="bg-white rounded-[2rem] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-extrabold text-slate-900 text-xl">All Activity</h3>
              <Link href="/dashboard" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Overview</Link>
            </div>
            <div className="flex flex-col gap-6 relative">
              <div className="absolute left-5 top-4 bottom-4 w-px bg-slate-100 -z-10"></div>
              {activities.length > 0 ? activities.map(renderActivityItem) : (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 border-4 border-white flex items-center justify-center shrink-0"><ActivityIcon className="w-4 h-4" /></div>
                  <div className="flex flex-col flex-1 pt-1">
                    <span className="font-bold text-slate-900 text-sm">No activity yet</span>
                    <span className="text-[12px] font-semibold text-slate-500">Your activity will appear here.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={storedLinks} receivedLinks={receivedLinks} transactions={transactions} address={address} />
      </main>
    </div>
  );
}
