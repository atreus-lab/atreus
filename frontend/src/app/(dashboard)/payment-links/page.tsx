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

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <AppHeader title="Payment Links" subtitle="Create, track, and manage your payment links" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>Shareable XLM payment links</p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            <Plus className="w-4 h-4" /> Create Link
          </Link>
        </div>

        {storedLinks.length === 0 && receivedLinks.length === 0 ? (
          <div className="panel p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--background-elevated)' }}>
              <Plus className="w-7 h-7" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2 className="section-title mb-2">No Payment Links Yet</h2>
            <p className="text-sm font-medium mb-6" style={{ color: 'var(--foreground-secondary)' }}>Create a payment link to receive XLM from anyone, even if they don&apos;t have a wallet.</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              <Plus className="w-4 h-4" /> Create Your First Link
            </Link>
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
