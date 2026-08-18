"use client";

import { Copy, Check, Undo2, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

interface LinkRowProps {
  amount: string;
  status: "pending" | "expired" | "claimed" | "received";
  badge?: ReactNode;
  date: string;
  txHash?: string;
  copiedId?: string;
  linkId: string;
  onCopy?: () => void;
  onRefund?: () => void;
  refunding?: boolean;
}

export default function LinkRow({
  amount, status, badge, date, txHash,
  copiedId, linkId, onCopy, onRefund, refunding,
}: LinkRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-grey-100 py-3 last:border-b-0">
      <span className="shrink-0 text-sm font-medium text-grey-900">{amount} XLM</span>
      <div className="flex min-w-0 items-center justify-end gap-2">
        {badge}
        <span className="truncate text-xs text-grey-400">{date}</span>
        {onRefund && (
          <button
            onClick={onRefund}
            disabled={refunding}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grey-50 text-grey-600 transition-colors hover:bg-grey-100 active:bg-grey-200"
            title="Refund"
          >
            {refunding ? <Loader2 className="h-3.5 w-3.5 animate-spin text-error" /> : <Undo2 className="h-3.5 w-3.5 text-error" />}
          </button>
        )}
        {onCopy && (
          <button onClick={onCopy} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grey-50 text-grey-600 transition-colors hover:bg-grey-100 active:bg-grey-200" title="Copy link">
            {copiedId === linkId ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}