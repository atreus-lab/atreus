"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, getTransactions, type StoredWallet } from "@/lib/wallet";
import { getStoredLinks, getClaimedLinks, type StoredLink } from "@/lib/links";
import { Activity as ActivityIcon, Link2, ArrowDownToLine, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from "lucide-react";
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

const ACTIVITY_CONFIG: Record<string, { icon: any; color: string }> = {
  link_created: { icon: Link2, color: '#a855f7' },
  link_claimed_by_other: { icon: CheckCircle2, color: '#22c55e' },
  claimed_by_you: { icon: ArrowDownToLine, color: '#3b82f6' },
  sent: { icon: ArrowUpRight, color: '#f97316' },
  received: { icon: ArrowDownLeft, color: '#22c55e' },
};

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
    getTransactions(pk, 50).then(setTransactions).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const activities = loading ? [] : buildActivityFeed(storedLinks, receivedLinks, transactions, address);

  return (
    <>
      <AppHeader title="Activity" subtitle="Your complete transaction history" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="panel flex flex-col">
            <div className="panel-header">
              <h3 className="section-title">All Activity</h3>
              <span className="text-xs font-semibold text-secondary">{activities.length} total</span>
            </div>
            <div className="panel-body">
              <div className="timeline">
                <div className="timeline-line" />
                {activities.length > 0 ? (
                  <div className="stagger-children">
                    {activities.map((item) => {
                      const config = ACTIVITY_CONFIG[item.type] || { icon: ActivityIcon, color: 'var(--foreground-secondary)' };
                      const IconComponent = config.icon;
                      return (
                        <div key={item.id} className="activity-item">
                          <div className="activity-dot" style={{ background: config.color }} />
                          <div className="activity-content">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-primary">{item.description}</span>
                              <span className="text-[11px] text-secondary">{new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <IconComponent className="w-3 h-3" style={{ color: config.color }} />
                              <span className="text-xs font-medium text-secondary">{item.amount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="activity-item">
                    <div className="activity-dot" style={{ background: 'var(--foreground-secondary)' }} />
                    <div className="activity-content">
                      <span className="font-bold text-sm text-primary">No activity yet</span>
                      <span className="text-xs text-secondary">Your activity will appear here.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={storedLinks} receivedLinks={receivedLinks} transactions={transactions} address={address} />
    </>
  );
}
