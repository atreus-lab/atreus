"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getTransactions, type StoredWallet } from "@/lib/wallet";
import { getStoredLinks, getClaimedLinks, type StoredLink } from "@/lib/links";
import { Activity as ActivityIcon, Link2, ArrowDownToLine, ArrowUpRight, ArrowDownLeft, CheckCircle2, ArrowLeft } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

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
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  const activities = buildActivityFeed(storedLinks, receivedLinks, transactions, address);

  function renderActivityItem(item: ActivityItem) {
    let iconStyle: Record<string, string>;
    let IconComponent: any;
    switch (item.type) {
      case 'link_created': IconComponent = Link2; iconStyle = { background: 'rgba(168,85,247,0.15)', color: '#a855f7' }; break;
      case 'link_claimed_by_other': IconComponent = CheckCircle2; iconStyle = { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }; break;
      case 'claimed_by_you': IconComponent = ArrowDownToLine; iconStyle = { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }; break;
      case 'sent': IconComponent = ArrowUpRight; iconStyle = { background: 'rgba(249,115,22,0.15)', color: '#f97316' }; break;
      case 'received': IconComponent = ArrowDownLeft; iconStyle = { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }; break;
      default: IconComponent = ActivityIcon; iconStyle = {};
    }
    return (
      <div key={item.id} className="flex items-start gap-4 group">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4" style={{ borderColor: 'var(--background-primary)', ...iconStyle }}><IconComponent className="w-4 h-4" /></div>
        <div className="flex flex-col flex-1 pt-1">
          <div className="flex items-center justify-between">
            <span style={{ color: 'var(--foreground-primary)' }} className="font-bold text-sm">{item.description}</span>
            <span style={{ color: 'var(--foreground-secondary)' }} className="text-[11px] font-semibold">{new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
          <span style={{ color: 'var(--foreground-secondary)' }} className="text-[12px] font-semibold">{item.amount}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader title="Activity" subtitle="Your complete transaction history" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content flex flex-col gap-6">
        <div className="panel flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="section-title" style={{ fontSize: '1.25rem' }}>All Activity</h3>
            <Link href="/dashboard" className="text-sm font-bold flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}><ArrowLeft className="w-4 h-4" /> Back to Overview</Link>
          </div>
          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-5 top-4 bottom-4 w-px -z-10" style={{ background: 'var(--border-default)' }}></div>
            {activities.length > 0 ? activities.map(renderActivityItem) : (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4" style={{ borderColor: 'var(--background-primary)', background: 'var(--surface-secondary)', color: 'var(--foreground-secondary)' }}><ActivityIcon className="w-4 h-4" /></div>
                <div className="flex flex-col flex-1 pt-1">
                  <span className="font-bold text-sm" style={{ color: 'var(--foreground-primary)' }}>No activity yet</span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--foreground-secondary)' }}>Your activity will appear here.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={storedLinks} receivedLinks={receivedLinks} transactions={transactions} address={address} />
    </>
  );
}
