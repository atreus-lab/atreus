"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Link2, CircleCheckBig, ArrowDownToLine, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getTransactions } from "@/lib/wallet";

interface ActivityItem {
  id: string;
  type: 'link_created' | 'link_claimed_by_other' | 'claimed_by_you' | 'sent' | 'received';
  description: string;
  amount: string;
  timestamp: number;
}

const ACTIVITY_COLORS: Record<string, string> = {
  link_created: '#f59e0b',
  link_claimed_by_other: '#16a34a',
  claimed_by_you: '#007cbf',
  sent: '#ef4444',
  received: '#16a34a',
};

const ACTIVITY_ICONS: Record<string, any> = {
  link_created: Link2,
  link_claimed_by_other: CircleCheckBig,
  claimed_by_you: ArrowDownToLine,
  sent: ArrowUpRight,
  received: ArrowDownLeft,
};

function buildActivityFeed(storedLinks: any[], receivedLinks: any[], transactions: any[], address: string): ActivityItem[] {
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

interface ActivityCardProps {
  storedLinks: any[];
  receivedLinks: any[];
  address: string;
  onBack: () => void;
}

export default function ActivityCard({ storedLinks, receivedLinks, address, onBack }: ActivityCardProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTransactions(address, 50)
      .then(txs => { if (active) setTransactions(txs); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [address]);

  const activities = buildActivityFeed(storedLinks, receivedLinks, transactions, address);

  return (
    <div className="text-center">
      <div className="flex-col text-left">
        <button onClick={onBack} className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Activity</h4>
        <p className="mb-4 text-left text-sm font-normal text-grey-700 mobile:text-base">Your complete transaction history.</p>

        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-xs font-bold text-grey-500">All Activity</h5>
          <span className="text-xs font-semibold text-grey-400">{loading ? "…" : `${activities.length} total`}</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-grey-400">Loading activity…</div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-grey-400">No activity yet — your transactions will appear here.</div>
        ) : (
          <div className="flex flex-col">
            {activities.map(item => {
              const IconComponent = ACTIVITY_ICONS[item.type] || Link2;
              const color = ACTIVITY_COLORS[item.type] || '#8095a0';
              return (
                <div key={item.id} className="flex items-center gap-3 border-b border-grey-100 py-3 last:border-b-0">
                  <IconComponent className="h-4 w-4 shrink-0" style={{ color }} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-grey-800">{item.description}</span>
                    <span className="text-xs text-grey-400">
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums" style={{ color }}>
                    {item.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex w-full items-center justify-between gap-2 pt-[15px]">
          <div className="w-full mobile:w-max">
            <button onClick={onBack} className="h-11 w-full rounded-lg border border-[#E0E7EB] px-3 text-sm font-medium text-grey-700 hover:bg-grey-50 mobile:w-max mobile:text-base">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}