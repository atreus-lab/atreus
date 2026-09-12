"use client";

import { memo } from "react";
import { Link2, CircleCheckBig, ArrowDownToLine, ArrowUpRight, ArrowDownLeft, ArrowRight } from "lucide-react";

interface RecentActivityProps {
  storedLinks: any[];
  receivedLinks: any[];
  transactions: any[];
  address: string;
  onViewAll?: () => void;
}

const RecentActivity = memo(function RecentActivity({ storedLinks, receivedLinks, transactions, address, onViewAll }: RecentActivityProps) {
  interface ActivityItem {
    id: string;
    type: 'link_created' | 'link_claimed_by_other' | 'claimed_by_you' | 'sent' | 'received';
    description: string;
    amount: string;
    timestamp: number;
  }

  const activities: ActivityItem[] = [];

  for (const link of storedLinks) {
    activities.push({
      id: `create-${link.id}`,
      type: 'link_created',
      description: 'Payment link created',
      amount: `${link.amount} XLM`,
      timestamp: link.createdAt,
    });
    if (link.claimed) {
      activities.push({
        id: `claimed-${link.id}`,
        type: 'link_claimed_by_other',
        description: 'Link claimed by recipient',
        amount: `${link.amount} XLM`,
        timestamp: link.createdAt,
      });
    }
  }

  for (const link of receivedLinks) {
    activities.push({
      id: `received-link-${link.id}`,
      type: 'claimed_by_you',
      description: 'Claimed via payment link',
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

  const sorted = activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 7);

  const activityColors: Record<string, string> = {
    link_created: '#f59e0b',
    link_claimed_by_other: '#16a34a',
    claimed_by_you: '#007cbf',
    sent: '#ef4444',
    received: '#16a34a',
  };
  const activityIcons: Record<string, any> = {
    link_created: Link2,
    link_claimed_by_other: CircleCheckBig,
    claimed_by_you: ArrowDownToLine,
    sent: ArrowUpRight,
    received: ArrowDownLeft,
  };

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-bold text-grey-800">Recent Activity</h3>
        {onViewAll ? (
          <button onClick={onViewAll} className="flex items-center gap-1 text-xs font-semibold text-grey-500 transition-colors hover:text-grey-800">View all <ArrowRight className="h-3 w-3" /></button>
        ) : (
          <span className="text-xs font-semibold text-grey-400">{activities.length} total</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="py-4 text-center text-xs text-grey-400">No recent activity</div>
      ) : (
        <div className="flex flex-col">
          {sorted.map((item) => {
            const IconComponent = activityIcons[item.type] || Link2;
            const color = activityColors[item.type] || '#8095a0';
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
    </div>
  );
});

export default RecentActivity;