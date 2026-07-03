"use client";

import { memo } from "react";
import { ArrowDownToLine, Send, Link2, PlusCircle, RefreshCw } from "lucide-react";
import QuickActionCard from "./ui/QuickActionCard";

interface QuickActionsProps {
  onClaimClick: () => void;
}

const ACTIONS = [
  { href: "/send", icon: Send, label: "Send Payment", desc: "Send crypto or tokens", color: "var(--accent-primary)" },
  { href: "/receive", icon: ArrowDownToLine, label: "Receive Payment", desc: "Receive crypto or tokens", color: "#22c55e" },
  { href: "/create", icon: Link2, label: "Create Payment Link", desc: "Create rules & share", color: "#a855f7" },
  { key: "claim", icon: PlusCircle, label: "Claim Payment Link", desc: "Claim funds from a link", color: "#a855f7" },
  { href: "/swap", icon: RefreshCw, label: "Swap Tokens", desc: "Instant token swaps", color: "#10b981" },
];

const QuickActions = memo(function QuickActions({ onClaimClick }: QuickActionsProps) {
  return (
    <div className="app-section">
      <h3 className="section-title">Quick Actions</h3>
      <p className="section-description">Do more with Atreus</p>
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar mt-4">
        {ACTIONS.map((item, i) => (
          <QuickActionCard
            key={i}
            icon={<item.icon className="w-[18px] h-[18px]" />}
            label={item.label}
            description={item.desc}
            iconColor={item.color}
            href={item.href}
            onClick={item.key === "claim" ? onClaimClick : undefined}
          />
        ))}
      </div>
    </div>
  );
});

export default QuickActions;
