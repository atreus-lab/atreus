"use client";

import { memo } from "react";
import Link from "next/link";
import { Activity, Link2, CheckCircle2, ArrowDownToLine, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface RecentActivityProps {
  storedLinks: any[];
  receivedLinks: any[];
  transactions: any[];
  address: string;
}

const RecentActivity = memo(function RecentActivity({ storedLinks, receivedLinks, transactions, address }: RecentActivityProps) {
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
    link_created: '#a855f7',
    link_claimed_by_other: '#22c55e',
    claimed_by_you: '#3b82f6',
    sent: '#f97316',
    received: '#22c55e',
  };
  const activityIcons: Record<string, any> = {
    link_created: Link2,
    link_claimed_by_other: CheckCircle2,
    claimed_by_you: ArrowDownToLine,
    sent: ArrowUpRight,
    received: ArrowDownLeft,
  };

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <h3 className="section-title">Recent Activity</h3>
        <Link href="/activity" className="text-sm font-bold text-accent">View all</Link>
      </div>

      <div className="panel-body">
        <div className="timeline">
          <div className="timeline-line" />

          {sorted.length === 0 ? (
            <div className="activity-item">
              <div className="activity-dot" style={{ background: 'var(--foreground-secondary)' }} />
              <div className="activity-content">
                <span className="font-bold text-sm text-primary">No recent activity</span>
                <span className="text-xs text-secondary">Your activity will appear here.</span>
              </div>
            </div>
          ) : (
            <div className="stagger-children">
              {sorted.map((item) => {
                const IconComponent = activityIcons[item.type] || Activity;
                const dotColor = activityColors[item.type] || 'var(--foreground-secondary)';
                return (
                  <div key={item.id} className="activity-item">
                    <div className="activity-dot" style={{ background: dotColor }} />
                    <div className="activity-content">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-primary">{item.description}</span>
                        <span className="activity-time">
                          {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <IconComponent className="w-3 h-3" style={{ color: dotColor }} />
                        <span className="text-xs font-medium text-secondary">{item.amount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default RecentActivity;
