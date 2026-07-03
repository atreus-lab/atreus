"use client";

import { CheckCircle2, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import LinkRow from "./ui/LinkRow";

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
    try { await onRefund(link.linkHashHex, link.secretHex); } finally { setRefundingId(null); }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="section-title flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Pending Links
        </h3>
        <span className="text-xs font-bold text-secondary">{pending.length} active</span>
      </div>
      <div className="panel-body flex flex-col gap-2">
        {pending.slice(0, 10).map((link) => {
          const isExpired = Date.now() > link.expiresAt * 1000;
          return (
            <LinkRow
              key={link.id}
              linkId={link.id}
              amount={link.amount}
              status={isExpired ? "expired" : "pending"}
              badge={
                <span className={`badge ${isExpired ? 'badge-error' : 'badge-warning'}`}>
                  {isExpired ? 'Expired' : 'Pending'}
                </span>
              }
              date={`${new Date(link.createdAt).toLocaleDateString()} — ${link.expiresAt >= 4102444800 ? 'No expiry' : `Expires ${new Date(link.expiresAt * 1000).toLocaleDateString()}`}`}
              copiedId={copiedLinkId}
              onCopy={() => onCopyLink(link.url, link.id)}
              onRefund={isExpired ? () => handleRefund(link) : undefined}
              refunding={refundingId === link.id}
            />
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
    <div className="panel">
      <div className="panel-header">
        <h3 className="section-title flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Claimed (Created by You)
        </h3>
        <span className="text-xs font-bold text-success">{claimed.length} total</span>
      </div>
      <div className="panel-body flex flex-col gap-2">
        {claimed.slice(0, 5).map((link) => (
          <LinkRow
            key={link.id}
            linkId={link.id}
            amount={link.amount}
            status="claimed"
            badge={
              <span className="badge badge-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Claimed
              </span>
            }
            date={link.createdAt ? `${new Date(link.createdAt).toLocaleDateString()} ${new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            txHash={link.txHash}
            copiedId={copiedLinkId}
            onCopy={link.txHash ? () => onCopyLink(link.txHash!, `tx-${link.id}`) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function ReceivedLinks({ links, onCopyLink, copiedLinkId }: { links: StoredLink[]; onCopyLink: (url: string, id: string) => void; copiedLinkId: string }) {
  if (links.length === 0) return null;

  return (
    <div id="received-links-section" className="panel">
      <div className="panel-header">
        <h3 className="section-title flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-accent" />
          Links You&apos;ve Claimed
        </h3>
        <span className="text-xs font-bold text-accent">{links.length} total</span>
      </div>
      <div className="panel-body flex flex-col gap-2">
        {links.slice(0, 5).map((link) => (
          <LinkRow
            key={link.id}
            linkId={link.id}
            amount={link.amount}
            status="received"
            badge={
              <span className="badge badge-info flex items-center gap-1">
                <ArrowDownToLine className="w-3 h-3" /> Received
              </span>
            }
            date={`${new Date(link.createdAt).toLocaleDateString()} ${new Date(link.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            txHash={link.txHash}
            copiedId={copiedLinkId}
            onCopy={link.txHash ? () => onCopyLink(link.txHash!, `rx-${link.id}`) : undefined}
          />
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
