"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Wallet, Link2, ArrowRightLeft,
  BarChart3, Activity, Shield, Settings, Send, ArrowDownToLine,
  PlusCircle, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownLeft,
  CheckCircle2,
} from "lucide-react";

interface SearchResult {
  id: string;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  category: string;
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  links?: { id: string; amount: string; claimed: boolean; url: string }[];
  receivedLinks?: { id: string; amount: string }[];
  transactions?: any[];
  address?: string;
}

const NAV_ACTIONS: SearchResult[] = [
  { id: "nav-dashboard", label: "Dashboard", description: "Overview of your wallet", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-wallet", label: "Wallet", description: "Manage your wallet", href: "/wallet", icon: <Wallet className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-swap", label: "Swap", description: "Swap tokens on the DEX", href: "/swap", icon: <ArrowRightLeft className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-send", label: "Send", description: "Send XLM or tokens", href: "/send", icon: <Send className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-receive", label: "Receive", description: "Receive assets", href: "/receive", icon: <ArrowDownToLine className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-create", label: "Create Link", description: "Create a payment link", href: "/create", icon: <Link2 className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-assets", label: "Assets", description: "Manage your assets", href: "/assets", icon: <RefreshCw className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-analytics", label: "Analytics", description: "View analytics", href: "/analytics", icon: <BarChart3 className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-activity", label: "Activity", description: "Recent activity", href: "/activity", icon: <Activity className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-security", label: "Security", description: "Security settings", href: "/security", icon: <Shield className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-settings", label: "Settings", description: "App settings", href: "/settings", icon: <Settings className="w-4 h-4" />, category: "Navigation" },
  { id: "nav-profile", label: "Profile", description: "Your profile", href: "/profile", icon: <Settings className="w-4 h-4" />, category: "Navigation" },
  { id: "action-claim", label: "Claim Link", description: "Claim funds from a payment link", href: "/claim", icon: <PlusCircle className="w-4 h-4" />, category: "Actions" },
];

export default function SearchDialog({ open, onClose, links, receivedLinks, transactions, address }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) return;
        onClose();
      }
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const allResults: SearchResult[] = [
    ...NAV_ACTIONS,
    ...(links || []).flatMap(l => [{
      id: `link-${l.id}`,
      label: `${l.amount} XLM Link`,
      description: l.claimed ? "Already claimed" : "Pending — click to view",
      href: l.url,
      icon: l.claimed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Link2 className="w-4 h-4 text-amber-500" />,
      category: "Payment Links",
    }]),
    ...(receivedLinks || []).map(l => ({
      id: `received-${l.id}`,
      label: `${l.amount} XLM Received`,
      description: "Claimed via payment link",
      href: "/activity",
      icon: <ArrowDownToLine className="w-4 h-4 text-accent" />,
      category: "Payment Links",
    })),
    ...(transactions || []).filter((tx: any) => tx.id).map((tx: any) => {
      const isSend = tx.from === address;
      return {
        id: `tx-${tx.id}`,
        label: isSend ? `Sent ${parseFloat(tx.amount).toFixed(2)} ${tx.asset_code || "XLM"}` : `Received ${parseFloat(tx.amount).toFixed(2)} ${tx.asset_code || "XLM"}`,
        description: isSend ? `To ${tx.to?.slice(0, 8)}...` : `From ${tx.from?.slice(0, 8)}...`,
        href: "/activity",
        icon: isSend ? <ArrowUpRight className="w-4 h-4 text-amber-500" /> : <ArrowDownLeft className="w-4 h-4 text-success" />,
        category: "Transactions",
      };
    }),
  ];

  const q = query.toLowerCase().trim();
  const filtered = q
    ? allResults.filter(r => r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    : allResults.slice(0, 8);

  const grouped: { category: string; items: SearchResult[] }[] = [];
  const seenCategories = new Set<string>();
  for (const r of filtered) {
    if (!seenCategories.has(r.category)) {
      seenCategories.add(r.category);
      grouped.push({ category: r.category, items: [r] });
    } else {
      grouped.find(g => g.category === r.category)!.items.push(r);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const s = filtered[selectedIndex]; if (s) navigateTo(s); }
  };

  const navigateTo = (result: SearchResult) => {
    onClose();
    if (result.href) router.push(result.href);
    else if (result.onClick) result.onClick();
  };

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  // No entry animation — keyboard-triggered (⌘K), must open instantly per Emil's rule
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 modal-content overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <Search className="w-4 h-4 text-secondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, links, transactions..."
            className="flex-1 text-sm font-medium outline-none bg-transparent text-primary"
          />
          <span className="kbd hidden sm:inline-flex">ESC</span>
        </div>

        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 px-4">
              <Search className="w-8 h-8 text-secondary" />
              <p className="text-sm font-bold text-secondary">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-secondary">Try searching for a page, link, or transaction.</p>
            </div>
          ) : (
            grouped.map((group, gi) => (
              <div key={group.category}>
                <div className="px-4 py-1.5 section-label">{group.category}</div>
                {group.items.map((result, ri) => {
                  const globalIndex = grouped.slice(0, gi).reduce((acc, g) => acc + g.items.length, 0) + ri;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={result.id}
                      data-index={globalIndex}
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? "bg-[rgba(255,255,255,0.06)]" : "hover:bg-[rgba(255,255,255,0.03)]"}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-elevated text-secondary">
                        {result.icon}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-bold text-primary truncate">{result.label}</span>
                        <span className="text-xs text-secondary mt-0.5 truncate">{result.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-elevated" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-secondary">
            <span className="kbd">↑↓</span> Navigate
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-secondary">
            <span className="kbd">↵</span> Open
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-secondary">
            <span className="kbd">ESC</span> Close
          </div>
        </div>
      </div>
    </div>
  );
}
