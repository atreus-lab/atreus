"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, getBalance, getBalances, getTransactions, type StoredWallet } from "@/lib/wallet";
import { getStoredLinks, refreshLinkStatuses, getClaimedLinks, refundLink, refundStoredLink, type StoredLink } from "@/lib/links";
import { Search, Bell, Menu } from "lucide-react";

import BalanceCard from "@/components/BalanceCard";
import PrivacyScoreCard from "@/components/PrivacyScoreCard";
import AssetsList from "@/components/AssetsList";
import RecentActivity from "@/components/RecentActivity";
import PaymentLinks from "@/components/PaymentLinks";
import QuickActions from "@/components/QuickActions";
import ClaimLinkModal from "@/components/ClaimLinkModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import SearchDialog from "@/components/SearchDialog";

export default function DashboardPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimLinkInput, setClaimLinkInput] = useState("");
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [storedLinks, setStoredLinks] = useState<StoredLink[]>([]);
  const [receivedLinks, setReceivedLinks] = useState<StoredLink[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; description: string; time: number; read: boolean; kind: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (addr: string) => {
    try {
      const [bal, bals, txs] = await Promise.all([
        getBalance(addr),
        getBalances(addr),
        getTransactions(addr, 5),
      ]);
      setBalance(bal);
      setBalances(bals);
      setTransactions(txs);
      return { bals, txs };
    } catch (err: any) {
      console.error(err);
      return { bals: [], txs: [] };
    }
  }, []);

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
      await loadData(address);
    } catch (err: any) {
      console.error("Refund failed:", err);
    }
  };

  const handleClaimLink = () => {
    const link = claimLinkInput.trim();
    if (!link) return;
    setShowClaimModal(false);
    setClaimLinkInput("");
    window.location.href = link;
  };

  // Hydrate notifiedRef from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("atreus_notified") || "[]");
      notifiedRef.current = new Set(stored);
    } catch {}
  }, []);

  // Notification check
  const checkForNotifications = useCallback(() => {
    const links = getStoredLinks();
    const claimed = getClaimedLinks();
    const pk = address;
    const notified = notifiedRef.current;

    for (const link of links) {
      const nid = `link-claimed-${link.secretHex}`;
      if (link.claimed && !notified.has(nid)) {
        notified.add(nid);
        setNotifications(prev => [{ id: nid, title: "Payment Link Claimed 🎉", description: `${link.amount} XLM has been claimed via your payment link.`, time: Date.now(), read: false, kind: 'link_claimed' }, ...prev].slice(0, 50));
      }
    }

    for (const link of claimed) {
      const nid = `you-claimed-${link.secretHex}`;
      if (!notified.has(nid)) {
        notified.add(nid);
        setNotifications(prev => [{ id: nid, title: "Link Claimed Successfully ✅", description: `You claimed ${link.amount} XLM via a payment link.`, time: Date.now(), read: false, kind: 'you_claimed' }, ...prev].slice(0, 50));
      }
    }

    const saveNotified = () => localStorage.setItem("atreus_notified", JSON.stringify([...notified]));

    if (pk) {
      getBalances(pk).then(bals => {
        for (const b of bals) {
          const code = b.asset_type === 'native' ? 'XLM' : b.asset_code;
          if (!code) continue;
          const nid = `asset-${code}`;
          if (!notified.has(nid)) {
            notified.add(nid);
            setNotifications(prev => [{ id: nid, title: `Asset Activated 💎`, description: `${code} has been activated in your wallet.`, time: Date.now(), read: false, kind: 'asset_added' }, ...prev].slice(0, 50));
          }
        }
      }).catch(() => {});
    }

    if (pk) {
      getTransactions(pk, 10).then(txs => {
        for (const tx of txs) {
          const nid = `tx-${tx.id}`;
          if (!notified.has(nid)) {
            notified.add(nid);
            const isSend = tx.from === pk;
            const amount = parseFloat(tx.amount).toFixed(2);
            const asset = tx.asset_code || 'XLM';
            setNotifications(prev => [{ id: nid, title: isSend ? `XLM Sent →` : `XLM Received ←`, description: isSend ? `${amount} ${asset} sent to ${tx.to?.slice(0, 8)}...` : `${amount} ${asset} received from ${tx.from?.slice(0, 8)}...`, time: new Date(tx.created_at).getTime(), read: false, kind: isSend ? 'sent' : 'received' }, ...prev].slice(0, 50));
          }
        }
        saveNotified();
      }).catch(() => saveNotified());
    } else {
      saveNotified();
    }
  }, [address]);

  // Periodic notification check
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => {
      refreshLinkStatuses().then(() => {
        setStoredLinks(getStoredLinks());
        setReceivedLinks(getClaimedLinks());
        checkForNotifications();
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [address, checkForNotifications]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!notifRef.current) return;
      const target = e.target as HTMLElement;
      if (notifRef.current.contains(target)) return;
      if (target.closest('[data-bell]')) return;
      setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Body scroll lock for mobile drawer
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Auto-refresh after claim
  useEffect(() => {
    const claimed = localStorage.getItem("atreus_claimed");
    if (claimed && address) {
      loadData(address);
    }
  }, [address, loadData]);

  // Init
  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) {
      router.push("/wallet");
      return;
    }
    setStoredWallet(wallet);
    const pk = wallet.publicKey;
    setAddress(pk);
    setLoading(true);
    setStoredLinks(getStoredLinks());
    setReceivedLinks(getClaimedLinks());
    loadData(pk).then((result) => {
      const notified = notifiedRef.current;
      if (result) {
        for (const tx of result.txs) {
          notified.add(`tx-${tx.id}`);
        }
        for (const b of result.bals) {
          const code = b.asset_type === 'native' ? 'XLM' : b.asset_code;
          if (code) notified.add(`asset-${code}`);
        }
      }
      for (const link of getClaimedLinks()) {
        notified.add(`you-claimed-${link.secretHex}`);
      }
    }).finally(() => setLoading(false));
    refreshLinkStatuses().then(() => {
      setStoredLinks(getStoredLinks());
      setReceivedLinks(getClaimedLinks());
      checkForNotifications();
    });
  }, [loadData, router, checkForNotifications]);

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';

  return (
    <>
      {/* Top Header */}
      <header className="app-header">
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary">
            Good afternoon, {emailName} <span className="inline-block">👋</span>
          </h1>
          <p className="text-sm font-medium mt-0.5 text-secondary">Here&apos;s what&apos;s happening with your wallet today.</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => setSearchOpen(true)} className="header-search-trigger w-56">
            <Search className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1 text-left">Search anything...</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="kbd">⌘</span>
              <span className="kbd">K</span>
            </div>
          </button>
          <button data-bell onClick={() => setShowNotifications(!showNotifications)} className="btn btn-icon btn-ghost relative" style={{ borderRadius: '9999px', border: '1px solid var(--border-default)' }}>
            <Bell className="w-[18px] h-[18px] text-secondary" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center bg-[var(--accent-primary)] text-white">{notifications.filter(n => !n.read).length}</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <button data-bell onClick={() => setShowNotifications(!showNotifications)} className="btn btn-icon btn-ghost relative" style={{ borderRadius: '9999px', border: '1px solid var(--border-default)' }}>
            <Bell className="w-[18px] h-[18px] text-secondary" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center bg-[var(--accent-primary)] text-white">{notifications.filter(n => !n.read).length}</span>
            )}
          </button>
          <button onClick={() => setMobileMenuOpen(true)} className="btn btn-icon btn-ghost" style={{ borderRadius: '9999px', border: '1px solid var(--border-default)' }}>
            <Menu className="w-[18px] h-[18px] text-secondary" />
          </button>
        </div>

        <NotificationDropdown
          notifications={notifications}
          show={showNotifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
          onDelete={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
          onDeleteAll={() => setNotifications([])}
          notifRef={notifRef}
        />
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="app-content flex flex-col gap-6">
          {/* Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BalanceCard balance={balance} showBalance={showBalance} onToggleBalance={() => setShowBalance(!showBalance)} onClaimClick={() => setShowClaimModal(true)} />
            <PrivacyScoreCard />
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssetsList balances={balances} />
            <RecentActivity storedLinks={storedLinks} receivedLinks={receivedLinks} transactions={transactions} address={address} />
          </div>

          {/* Payment Links */}
          <PaymentLinks storedLinks={storedLinks} receivedLinks={receivedLinks} copiedLinkId={copiedLinkId} onCopyLink={copyLink} onRefund={handleRefund} />

          {/* Quick Actions */}
          <QuickActions onClaimClick={() => setShowClaimModal(true)} />
        </div>
      )}

      {/* Modals & Overlays */}
      <ClaimLinkModal show={showClaimModal} input={claimLinkInput} onInputChange={setClaimLinkInput} onClaim={handleClaimLink} onClose={() => { setShowClaimModal(false); setClaimLinkInput(""); }} />

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={storedLinks} receivedLinks={receivedLinks} transactions={transactions} address={address} />
    </>
  );
}
