"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import { getStoredLinks, refreshLinkStatuses, getClaimedLinks, refundLink, refundStoredLink, type StoredLink } from "@/lib/links";
import { Plus } from "lucide-react";
import Link from "next/link";

import AppHeader from "@/components/AppHeader";
import PaymentLinksClient from "@/components/PaymentLinks";
import SearchDialog from "@/components/SearchDialog";
import EmptyState from "@/components/ui/EmptyState";

export default function PaymentLinksPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [storedLinks, setStoredLinks] = useState<StoredLink[]>([]);
  const [receivedLinks, setReceivedLinks] = useState<StoredLink[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(""), 2000);
  };

  const handleRefund = async (linkHashHex: string, secretHex: string) => {
    try {
      await refundLink(linkHashHex);
      refundStoredLink(secretHex);
      setStoredLinks(getStoredLinks());
    } catch (err: any) {
      console.error("Refund failed:", err);
    }
  };

  // Init
  useEffect(() => {
    setMounted(true);
    const w = loadWallet();
    if (!w) { router.push("/onboard"); return; }
    setWallet(w);
    setStoredLinks(getStoredLinks());
    setReceivedLinks(getClaimedLinks());
  }, [router]);

  // Poll link status
  useEffect(() => {
    if (!wallet) return;
    const interval = setInterval(async () => {
      await refreshLinkStatuses();
      setStoredLinks(getStoredLinks());
      setReceivedLinks(getClaimedLinks());
    }, 15000);
    return () => clearInterval(interval);
  }, [wallet]);

  // ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <AppHeader
        title="Payment Links"
        subtitle="Create, track, and manage your payment links"
        backHref="/dashboard"
        onSearchOpen={() => setSearchOpen(true)}
        rightContent={
          <Link href="/create" className="btn-primary px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Link
          </Link>
        }
      />
      <div className="app-content max-w-5xl mx-auto">
        {!mounted ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : storedLinks.length === 0 && receivedLinks.length === 0 ? (
          <div className="panel p-8">
            <EmptyState
              icon={<Plus className="w-6 h-6" />}
              title="No Payment Links Yet"
              description="Create a payment link to receive XLM from anyone, even if they don't have a wallet."
              action={
                <Link href="/create" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold">
                  <Plus className="w-4 h-4" /> Create Your First Link
                </Link>
              }
            />
          </div>
        ) : (
          <PaymentLinksClient
            storedLinks={storedLinks}
            receivedLinks={receivedLinks}
            copiedLinkId={copiedLinkId}
            onCopyLink={copyLink}
            onRefund={handleRefund}
          />
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
