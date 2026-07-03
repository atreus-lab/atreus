"use client";

import { CheckCircle2, ArrowDownToLine, Copy, Check, Undo2, Loader2 } from "lucide-react";
import { useState } from "react";

interface StoredLink {
  id: string;
  amount: string;
  claimed: boolean;
  createdAt: number;
  expiresAt: number;
  url: string;
  secretHex: string;
  linkHashHex?: string;
  txHash?: string;
}

interface PaymentLinksProps {
  storedLinks: StoredLink[];
  receivedLinks: StoredLink[];
  copiedLinkId: string;
  onCopyLink: (url: string, id: string) => void;
  onRefund: (linkHashHex: string, secretHex: string) => Promise<void>;
}

function PendingLinks({ links, onCopyLink, onRefund, copiedLinkId }: { links: StoredLink[]; onCopyLink: (url: string, id: string) => void; onRefund: (linkHashHex: string, secretHex: string) => Promise<void>; copiedLinkId: string }) {
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const pending = links.filter(l => !l.claimed);
  if (pending.length === 0) return null;

  const handleRefund = async (link: StoredLink) => {
    if (!link.linkHashHex) return;
    setRefundingId(link.id);
    try {
      await onRefund(link.linkHashHex, link.secretHex);
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
          Pending Links
        </h3>
        <span className="text-xs font-bold text-slate-400">{pending.length} active</span>
      </div>
      <div className="flex flex-col gap-3">
        {pending.slice(0, 10).map((link) => {
          const isExpired = Date.now() > link.expiresAt * 1000;
          return (
            <div key={link.id} className={`flex items-center justify-between p-3 rounded-xl border ${isExpired ? 'bg-red-50/40 border-red-100/60' : 'bg-amber-50/40 border-amber-100/60'}`}>
              <div className="flex flex-col min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{link.amount} XLM</span>
                  {isExpired ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Expired</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Pending</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(link.createdAt).toLocaleDateString()} - {link.expiresAt >= 4102444800 ? 'No expiry' : `Expires ${new Date(link.expiresAt * 1000).toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isExpired && (
                  <button
                    onClick={() => handleRefund(link)}
                    disabled={refundingId === link.id}
                    className="p-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                    title="Refund"
                  >
                    {refundingId === link.id ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> : <Undo2 className="w-4 h-4 text-red-500" />}
                  </button>
                )}
                <button onClick={() => onCopyLink(link.url, link.id)} className="p-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-colors" title="Copy link">
                  {copiedLinkId === link.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-amber-500" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClaimedByYouLinks({ links, onCopyLink, copiedLinkId }: { links: StoredLink[]; onCopyLink: (url: string, id: string) => void; copiedLinkId: string }) {
  const claimed = links.filter(l => l.claimed);
  if (claimed.length === 0) return null;

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          Claimed (Created by You)
        </h3>
        <span className="text-xs font-bold text-green-500">{claimed.length} total</span>
      </div>
      <div className="flex flex-col gap-3">
        {claimed.slice(0, 5).map((link) => (
          <div key={link.id} className="flex items-center justify-between p-3 rounded-xl bg-green-50/30 border border-green-100/60">
            <div className="flex flex-col min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{link.amount} XLM</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Claimed
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">{link.createdAt ? new Date(link.createdAt).toLocaleDateString() : ''} {link.createdAt ? new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              {link.txHash && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">TX: {link.txHash.slice(0, 16)}...</span>
                  <button onClick={() => onCopyLink(link.txHash!, `tx-${link.id}`)} className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0" title="Copy transaction hash">
                    {copiedLinkId === `tx-${link.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceivedLinks({ links, onCopyLink, copiedLinkId }: { links: StoredLink[]; onCopyLink: (url: string, id: string) => void; copiedLinkId: string }) {
  if (links.length === 0) return null;

  return (
    <div id="received-links-section" className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-blue-500" />
          Links You&apos;ve Claimed
        </h3>
        <span className="text-xs font-bold text-blue-500">{links.length} total</span>
      </div>
      <div className="flex flex-col gap-3">
        {links.slice(0, 5).map((link) => (
          <div key={link.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/30 border border-blue-100/60">
            <div className="flex flex-col min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{link.amount} XLM</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                  <ArrowDownToLine className="w-3 h-3" /> Received
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">{new Date(link.createdAt).toLocaleDateString()} {new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {link.txHash && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">TX: {link.txHash.slice(0, 16)}...</span>
                  <button onClick={() => onCopyLink(link.txHash!, `rx-${link.id}`)} className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0" title="Copy transaction hash">
                    {copiedLinkId === `rx-${link.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaymentLinks({ storedLinks, receivedLinks, copiedLinkId, onCopyLink, onRefund }: PaymentLinksProps) {
  if (storedLinks.length === 0 && receivedLinks.length === 0) return null;

  return (
    <div id="my-links-section" className="space-y-6">
      <PendingLinks links={storedLinks} onCopyLink={onCopyLink} onRefund={onRefund} copiedLinkId={copiedLinkId} />
      <ClaimedByYouLinks links={storedLinks} onCopyLink={onCopyLink} copiedLinkId={copiedLinkId} />
      <ReceivedLinks links={receivedLinks} onCopyLink={onCopyLink} copiedLinkId={copiedLinkId} />
    </div>
  );
}
