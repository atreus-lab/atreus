"use client";

import Link from "next/link";
import { Activity, Link2, CheckCircle2, ArrowDownToLine, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface RecentActivityProps {
  storedLinks: any[];
  receivedLinks: any[];
  transactions: any[];
  address: string;
}

export default function RecentActivity({ storedLinks, receivedLinks, transactions, address }: RecentActivityProps) {
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

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-extrabold text-slate-900">Recent Activity</h3>
        <Link href="/activity" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View all</Link>
      </div>

      <div className="flex flex-col gap-6 relative">
        <div className="absolute left-5 top-4 bottom-4 w-px bg-slate-100 -z-10"></div>

        {sorted.length === 0 ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 border-4 border-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex flex-col flex-1 pt-1">
              <span className="font-bold text-slate-900 text-sm">No recent activity</span>
              <span className="text-[12px] font-semibold text-slate-500">Your activity will appear here.</span>
            </div>
          </div>
        ) : (
          sorted.map((item) => {
            let iconColor: string;
            let IconComponent: any;
            switch (item.type) {
              case 'link_created': IconComponent = Link2; iconColor = 'bg-purple-50 text-purple-500'; break;
              case 'link_claimed_by_other': IconComponent = CheckCircle2; iconColor = 'bg-green-50 text-green-500'; break;
              case 'claimed_by_you': IconComponent = ArrowDownToLine; iconColor = 'bg-blue-50 text-blue-500'; break;
              case 'sent': IconComponent = ArrowUpRight; iconColor = 'bg-orange-50 text-orange-500'; break;
              case 'received': IconComponent = ArrowDownLeft; iconColor = 'bg-green-50 text-green-500'; break;
              default: IconComponent = Activity; iconColor = 'bg-slate-50 text-slate-400';
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
                  <span className="text-[12px] font-semibold text-slate-500">{item.amount}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
