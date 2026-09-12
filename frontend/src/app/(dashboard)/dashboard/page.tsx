"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Link2, Wand2 } from "lucide-react";
import { loadWallet, getBalance, getBalances, getTransactions, type StoredWallet } from "@/lib/wallet";
import { useWallet } from "@/components/providers";
import { useSidebar } from "@/components/sidebar-context";
import { getStoredLinks, refreshLinkStatuses, getClaimedLinks, refundLink, refundStoredLink, type StoredLink } from "@/lib/links";
import BalanceCard from "@/components/BalanceCard";
import AssetsList from "@/components/AssetsList";
import RecentActivity from "@/components/RecentActivity";
import PaymentLinks from "@/components/PaymentLinks";
import ClaimLinkModal from "@/components/ClaimLinkModal";
import SearchDialog from "@/components/SearchDialog";
import AppHeader from "@/components/AppHeader";
import SwapCard from "@/components/SwapCard";
import SendCard from "@/components/SendCard";
import AddFundsCard from "@/components/AddFundsCard";
import WithdrawCard from "@/components/WithdrawCard";
import CreateLinkCard from "@/components/CreateLinkCard";
import ManageAssetsCard from "@/components/ManageAssetsCard";
import SettingsCard from "@/components/SettingsCard";
import SecurityCard from "@/components/SecurityCard";
import ActivityCard from "@/components/ActivityCard";

export default function DashboardPage() {
  const router = useRouter();
  const { publicKey, isLoading: walletLoading } = useWallet();
  const { settingsRequested, clearSettingsRequest, securityRequested, clearSecurityRequest, activityRequested, clearActivityRequest } = useSidebar();
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
  const [tab, setTab] = useState<"assets" | "links" | "activity">("assets");
  const [view, setView] = useState<"default" | "swap" | "send" | "addfunds" | "withdraw" | "createlink" | "manageassets" | "settings" | "security" | "activity">("default");
  const [sendDestination, setSendDestination] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());
  const { pushNotification } = useSidebar();

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
        pushNotification({ id: nid, title: "Payment Link Claimed 🎉", description: `${link.amount} XLM has been claimed via your payment link.`, time: Date.now(), read: false, kind: 'link_claimed' });
      }
    }

    for (const link of claimed) {
      const nid = `you-claimed-${link.secretHex}`;
      if (!notified.has(nid)) {
        notified.add(nid);
        pushNotification({ id: nid, title: "Link Claimed Successfully ✅", description: `You claimed ${link.amount} XLM via a payment link.`, time: Date.now(), read: false, kind: 'you_claimed' });
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
            pushNotification({ id: nid, title: `Asset Activated 💎`, description: `${code} has been activated in your wallet.`, time: Date.now(), read: false, kind: 'asset_added' });
          }
        }
      }).catch(() => {});
    }

    if (pk) {
      getTransactions(pk, 10).then(txs => {
        setTransactions(prev => {
          const seen = new Set(prev.map(t => t.id));
          const merged = [...prev];
          for (const tx of txs) {
            if (!seen.has(tx.id)) {
              merged.push(tx);
              seen.add(tx.id);
            }
          }
          return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
        });
        for (const tx of txs) {
          const nid = `tx-${tx.id}`;
          if (!notified.has(nid)) {
            notified.add(nid);
            const isSend = tx.from === pk;
            const amount = parseFloat(tx.amount).toFixed(2);
            const asset = tx.asset_code || 'XLM';
            pushNotification({ id: nid, title: isSend ? `XLM Sent →` : `XLM Received ←`, description: isSend ? `${amount} ${asset} sent to ${tx.to?.slice(0, 8)}...` : `${amount} ${asset} received from ${tx.from?.slice(0, 8)}...`, time: new Date(tx.created_at).getTime(), read: false, kind: isSend ? 'sent' : 'received' });
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

  // Settings requested from the profile drawer → open the inline settings view
  useEffect(() => {
    if (settingsRequested) {
      setView("settings");
      clearSettingsRequest();
    }
  }, [settingsRequested, clearSettingsRequest]);

  // Security requested from the profile drawer → open the inline security view
  useEffect(() => {
    if (securityRequested) {
      setView("security");
      clearSecurityRequest();
    }
  }, [securityRequested, clearSecurityRequest]);

  // Activity requested from the profile drawer → open the inline activity view
  useEffect(() => {
    if (activityRequested) {
      setView("activity");
      clearActivityRequest();
    }
  }, [activityRequested, clearActivityRequest]);

  // Auto-refresh after claim
  useEffect(() => {
    const claimed = localStorage.getItem("atreus_claimed");
    if (claimed && address) {
      loadData(address);
    }
  }, [address, loadData]);

  // Init
  useEffect(() => {
    if (walletLoading) return;
    if (!publicKey) {
      router.push("/wallet");
      return;
    }
    setAddress(publicKey);
    setLoading(true);
    setStoredLinks(getStoredLinks());
    setReceivedLinks(getClaimedLinks());

    const wallet = loadWallet();
    setStoredWallet(wallet);

    loadData(publicKey).then((result) => {
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
  }, [publicKey, walletLoading, loadData, router, checkForNotifications]);

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';

  return (
    <>
      <AppHeader />

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="app-content flex justify-center">
          <div className="w-full max-w-[803px] flex flex-col gap-6 pb-20">
            <BalanceCard balance={balance} showBalance={showBalance} onToggleBalance={() => setShowBalance(!showBalance)} emailName={emailName} publicKey={publicKey} balances={balances} hideHero={view !== "default"} onSwap={() => setView("swap")} onSend={() => setView("send")} onAddFunds={() => setView("addfunds")} onWithdraw={() => setView("withdraw")}>
              {view === "swap" && publicKey ? (
                <SwapCard publicKey={publicKey} balances={balances} showBack onBack={() => setView("default")} />
              ) : view === "send" && publicKey ? (
                <SendCard publicKey={publicKey} initialDestination={sendDestination} onBack={() => { setView("default"); setSendDestination(""); }} onSent={() => { loadData(address); }} />
              ) : view === "addfunds" && publicKey ? (
                <AddFundsCard publicKey={publicKey} onBack={() => setView("default")} />
              ) : view === "withdraw" && publicKey ? (
                <WithdrawCard publicKey={publicKey} onBack={() => setView("default")} onSent={() => { loadData(address); }} />
              ) : view === "createlink" && publicKey ? (
                <CreateLinkCard publicKey={publicKey} onBack={() => { setView("default"); setTab("links"); }} onCreated={() => { setStoredLinks(getStoredLinks()); }} />
              ) : view === "manageassets" && publicKey ? (
                <ManageAssetsCard publicKey={publicKey} onBack={() => { setView("default"); setTab("assets"); }} onChanged={() => { loadData(address); }} />
              ) : view === "settings" && publicKey ? (
                <SettingsCard publicKey={publicKey} onBack={() => { setView("default"); }} onSendTo={(addr) => { setSendDestination(addr); setView("send"); }} />
              ) : view === "security" && publicKey ? (
                <SecurityCard publicKey={publicKey} onBack={() => { setView("default"); }} />
              ) : view === "activity" && publicKey ? (
                <ActivityCard address={address} storedLinks={storedLinks} receivedLinks={receivedLinks} onBack={() => { setView("default"); }} />
              ) : (
                <>
                  <div className="tabs">
                    <button className="tab" data-active={tab === "assets"} onClick={() => setTab("assets")}>Assets</button>
                    <button className="tab" data-active={tab === "links"} onClick={() => setTab("links")}>Payment Links</button>
                    <button className="tab" data-active={tab === "activity"} onClick={() => setTab("activity")}>Activity</button>
                  </div>

                  <div className="pt-5">
                    {tab === "assets" && <AssetsList balances={balances} onManageAssets={() => setView("manageassets")} onChanged={() => { loadData(address); }} />}

                    {tab === "links" && (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-bold text-grey-800">Payment Links</h3>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setView("createlink")} className="flex h-11 items-center gap-2 rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 active:bg-blue-200">
                              <Link2 className="h-4 w-4" />
                              Create Link
                            </button>
                            <button onClick={() => setShowClaimModal(true)} className="flex h-11 items-center gap-2 rounded-lg bg-primaryBlue px-4 text-sm font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700">
                              <Wand2 className="h-4 w-4" />
                              Claim
                            </button>
                          </div>
                        </div>
                        <PaymentLinks storedLinks={storedLinks} receivedLinks={receivedLinks} copiedLinkId={copiedLinkId} onCopyLink={copyLink} onRefund={handleRefund} />
                      </div>
                    )}

                    {tab === "activity" && (
                      <RecentActivity storedLinks={storedLinks} receivedLinks={receivedLinks} transactions={transactions} address={address} onViewAll={() => setView("activity")} />
                    )}
                  </div>
                </>
              )}
            </BalanceCard>
          </div>
        </div>
      )}

      {/* Modals & Overlays */}
      <ClaimLinkModal show={showClaimModal} input={claimLinkInput} onInputChange={setClaimLinkInput} onClaim={handleClaimLink} onClose={() => { setShowClaimModal(false); setClaimLinkInput(""); }} />

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={storedLinks} receivedLinks={receivedLinks} transactions={transactions} address={address} />
    </>
  );
}
