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
    <div className="panel p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"></span>
          Pending Links
        </h3>
        <span className="text-xs font-bold" style={{ color: 'var(--foreground-secondary)' }}>{pending.length} active</span>
      </div>
      <div className="flex flex-col gap-3">
        {pending.slice(0, 10).map((link) => {
          const isExpired = Date.now() > link.expiresAt * 1000;
          return (
            <div key={link.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isExpired ? 'rgba(248,113,113,0.1)' : 'rgba(245,158,11,0.1)', border: isExpired ? '1px solid rgba(248,113,113,0.2)' : '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex flex-col min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: 'var(--foreground-primary)' }}>{link.amount} XLM</span>
                  {isExpired ? (
                    <span className="badge badge-error">Expired</span>
                  ) : (
                    <span className="badge badge-warning">Pending</span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>
                  {new Date(link.createdAt).toLocaleDateString()} - {link.expiresAt >= 4102444800 ? 'No expiry' : `Expires ${new Date(link.expiresAt * 1000).toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isExpired && (
                  <button
                    onClick={() => handleRefund(link)}
                    disabled={refundingId === link.id}
                    className="btn-icon btn-ghost" style={{ border: '1px solid rgba(248,113,113,0.3)' }}
                    title="Refund"
                  >
                    {refundingId === link.id ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> : <Undo2 className="w-4 h-4 text-red-500" />}
                  </button>
                )}
                <button onClick={() => onCopyLink(link.url, link.id)} className="btn-icon btn-ghost" style={{ border: '1px solid rgba(245,158,11,0.3)' }} title="Copy link">
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
    <div className="panel p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          Claimed (Created by You)
        </h3>
        <span className="text-xs font-bold text-green-500">{claimed.length} total</span>
      </div>
      <div className="flex flex-col gap-3">
        {claimed.slice(0, 5).map((link) => (
          <div key={link.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="flex flex-col min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: 'var(--foreground-primary)' }}>{link.amount} XLM</span>
                <span className="badge badge-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Claimed
                </span>
              </div>
              <span className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>{link.createdAt ? new Date(link.createdAt).toLocaleDateString() : ''} {link.createdAt ? new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              {link.txHash && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] font-mono truncate max-w-[150px]" style={{ color: 'var(--foreground-secondary)' }}>TX: {link.txHash.slice(0, 16)}...</span>
                  <button onClick={() => onCopyLink(link.txHash!, `tx-${link.id}`)} className="btn-icon btn-ghost shrink-0" title="Copy transaction hash">
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
    <div id="received-links-section" className="panel p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-title flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-blue-500" />
          Links You&apos;ve Claimed
        </h3>
        <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>{links.length} total</span>
      </div>
      <div className="flex flex-col gap-3">
        {links.slice(0, 5).map((link) => (
          <div key={link.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex flex-col min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: 'var(--foreground-primary)' }}>{link.amount} XLM</span>
                <span className="badge badge-info flex items-center gap-1">
                  <ArrowDownToLine className="w-3 h-3" /> Received
                </span>
              </div>
              <span className="text-[10px] mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>{new Date(link.createdAt).toLocaleDateString()} {new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {link.txHash && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] font-mono truncate max-w-[150px]" style={{ color: 'var(--foreground-secondary)' }}>TX: {link.txHash.slice(0, 16)}...</span>
                  <button onClick={() => onCopyLink(link.txHash!, `rx-${link.id}`)} className="btn-icon btn-ghost shrink-0" title="Copy transaction hash">
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
