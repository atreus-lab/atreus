"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowDownToLine, Send, Link2, PlusCircle, RefreshCw } from "lucide-react";

interface QuickActionsProps {
  onClaimClick: () => void;
}

const QuickActions = memo(function QuickActions({ onClaimClick }: QuickActionsProps) {
  return (
    <div className="app-section">
      <h3 className="section-title">Quick Actions</h3>
      <p className="section-description">Do more with Atreus</p>
      <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar mt-4">
        {[
          { href: "/send", icon: Send, label: "Send Payment", desc: "Send crypto or tokens", color: "var(--accent-primary)" },
          { href: "/receive", icon: ArrowDownToLine, label: "Receive Payment", desc: "Receive crypto or tokens", color: "#22c55e" },
          { href: "/create", icon: Link2, label: "Create Payment Link", desc: "Create rules & share", color: "#a855f7" },
          { onClick: onClaimClick, icon: PlusCircle, label: "Claim Payment Link", desc: "Claim funds from a link", color: "#a855f7" },
          { href: "/swap", icon: RefreshCw, label: "Swap Tokens", desc: "Instant token swaps", color: "#10b981" },
        ].map((item, i) => {
          const content = (
            <>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}15`, color: item.color }}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate" style={{ color: 'var(--foreground-primary)' }}>{item.label}</span>
                <span className="text-[10px] font-medium truncate" style={{ color: 'var(--foreground-secondary)' }}>{item.desc}</span>
              </div>
            </>
          );
          const cls = "surface surface-hover flex items-center gap-3 p-4 min-w-[220px]";
          if (item.href) {
            return <Link key={i} href={item.href} className={cls}>{content}</Link>;
          }
          return <button key={i} onClick={item.onClick} className={`${cls} text-left`}>{content}</button>;
        })}
      </div>
    </div>
  );
});

export default QuickActions;
