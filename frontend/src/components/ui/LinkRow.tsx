"use client";

import { Copy, Check, Undo2, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

interface LinkRowProps {
  amount: string;
  status: "pending" | "expired" | "claimed" | "received";
  badge: ReactNode;
  date: string;
  txHash?: string;
  copiedId?: string;
  linkId: string;
  onCopy?: () => void;
  onRefund?: () => void;
  refunding?: boolean;
}

const statusClass: Record<string, string> = {
  pending: "link-row--pending",
  expired: "link-row--expired",
  claimed: "link-row--claimed",
  received: "link-row--received",
};

export default function LinkRow({
  amount, status, badge, date, txHash,
  copiedId, linkId, onCopy, onRefund, refunding,
}: LinkRowProps) {
  return (
    <div className={`link-row ${statusClass[status]}`}>
      <div className="flex flex-col min-w-0 flex-1 mr-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-primary">{amount} XLM</span>
          {badge}
        </div>
        <span className="text-[10px] text-secondary mt-0.5">{date}</span>
        {txHash && (
          <span className="text-[10px] font-mono text-secondary mt-1 truncate max-w-[150px]">
            TX: {txHash.slice(0, 16)}...
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onRefund && (
          <button
            onClick={onRefund}
            disabled={refunding}
            className="btn btn-icon btn-ghost"
            title="Refund"
          >
            {refunding ? <Loader2 className="w-4 h-4 text-error animate-spin" /> : <Undo2 className="w-4 h-4 text-error" />}
          </button>
        )}
        {onCopy && (
          <button onClick={onCopy} className="btn btn-icon btn-ghost" title="Copy link">
            {copiedId === linkId ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-secondary" />}
          </button>
        )}
      </div>
    </div>
  );
}
