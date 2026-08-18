"use client";

import { useState, type ReactNode } from "react";
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

function Section({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-xs font-bold text-grey-500">{title}</h3>
        <span className="text-xs text-grey-400">{count}</span>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
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
    <Section title="Pending" count={`${pending.length} active`}>
      {pending.slice(0, 10).map((link) => {
        const isExpired = Date.now() > link.expiresAt * 1000;
        return (
          <LinkRow
            key={link.id}
            linkId={link.id}
            amount={link.amount}
            status={isExpired ? "expired" : "pending"}
            badge={
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isExpired ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                {isExpired ? "Expired" : "Pending"}
              </span>
            }
            date={isExpired ? "Expired link" : `Expires ${new Date(link.expiresAt * 1000).toLocaleDateString()}`}
            copiedId={copiedLinkId}
            onCopy={() => onCopyLink(link.url, link.id)}
            onRefund={isExpired ? () => handleRefund(link) : undefined}
            refunding={refundingId === link.id}
          />
        );
      })}
    </Section>
  );
}

function ClaimedByYouLinks({ links, onCopyLink, copiedLinkId }: { links: StoredLink[]; onCopyLink: (url: string, id: string) => void; copiedLinkId: string }) {
  const claimed = links.filter(l => l.claimed);
  if (claimed.length === 0) return null;

  return (
    <Section title="Claimed (Created by You)" count={`${claimed.length} total`}>
      {claimed.slice(0, 5).map((link) => (
        <LinkRow
          key={link.id}
          linkId={link.id}
          amount={link.amount}
          status="claimed"
          date={link.createdAt ? new Date(link.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
          txHash={link.txHash}
          copiedId={copiedLinkId}
          onCopy={link.txHash ? () => onCopyLink(link.txHash!, `tx-${link.id}`) : undefined}
        />
      ))}
    </Section>
  );
}

function ReceivedLinks({ links, onCopyLink, copiedLinkId }: { links: StoredLink[]; onCopyLink: (url: string, id: string) => void; copiedLinkId: string }) {
  if (links.length === 0) return null;

  return (
    <div id="received-links-section">
      <Section title="Links You've Claimed" count={`${links.length} total`}>
        {links.slice(0, 5).map((link) => (
          <LinkRow
            key={link.id}
            linkId={link.id}
            amount={link.amount}
            status="received"
            date={link.createdAt ? new Date(link.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
            txHash={link.txHash}
            copiedId={copiedLinkId}
            onCopy={link.txHash ? () => onCopyLink(link.txHash!, `rx-${link.id}`) : undefined}
          />
        ))}
      </Section>
    </div>
  );
}

export default function PaymentLinks({ storedLinks, receivedLinks, copiedLinkId, onCopyLink, onRefund }: PaymentLinksProps) {
  if (storedLinks.length === 0 && receivedLinks.length === 0) return null;

  return (
    <div id="my-links-section" className="flex flex-col gap-6">
      <PendingLinks links={storedLinks} onCopyLink={onCopyLink} onRefund={onRefund} copiedLinkId={copiedLinkId} />
      <ClaimedByYouLinks links={storedLinks} onCopyLink={onCopyLink} copiedLinkId={copiedLinkId} />
      <ReceivedLinks links={receivedLinks} onCopyLink={onCopyLink} copiedLinkId={copiedLinkId} />
    </div>
  );
}