"use client";

import { memo } from "react";
import { ArrowDownToLine, Send, Link2, PlusCircle, RefreshCw } from "lucide-react";
import QuickActionCard from "./ui/QuickActionCard";

interface QuickActionsProps {
  onClaimClick: () => void;
  onCreateLinkClick: () => void;
}

const ACTIONS = [
  { href: "/send", icon: Send, label: "Send Payment", desc: "Send crypto or tokens" },
  { href: "/receive", icon: ArrowDownToLine, label: "Receive Payment", desc: "Receive crypto or tokens" },
  { key: "create", icon: Link2, label: "Create Payment Link", desc: "Create rules & share" },
  { key: "claim", icon: PlusCircle, label: "Claim Payment Link", desc: "Claim funds from a link" },
  { href: "/swap", icon: RefreshCw, label: "Swap Tokens", desc: "Instant token swaps" },
];

const QuickActions = memo(function QuickActions({ onClaimClick, onCreateLinkClick }: QuickActionsProps) {
  return (
    <div className="app-section">
      <h3 className="section-title">Quick Actions</h3>
      <p className="section-description">Do more with Atreus</p>
      <div className="quick-action-grid mt-4">
        {ACTIONS.map((item, i) => (
          <QuickActionCard
            key={i}
            icon={<item.icon className="w-[18px] h-[18px]" />}
            label={item.label}
            description={item.desc}
            href={item.href}
            onClick={item.key === "claim" ? onClaimClick : item.key === "create" ? onCreateLinkClick : undefined}
          />
        ))}
      </div>
    </div>
  );
});

export default QuickActions;
