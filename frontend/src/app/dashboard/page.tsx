"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { connectWallet, getAccountBalances, getNativeBalance, getRecentTransactions, getStellarExpertUrl, type Balance, type Transaction } from "@/lib/stellar";
import { Loader2, Wallet, Send, ArrowDownToLine, RefreshCw, ExternalLink, Link2 } from "lucide-react";

export default function DashboardPage() {
  const [address, setAddress] = useState("");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [nativeBalance, setNativeBalance] = useState("0");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError("");
      const addr = await connectWallet();
      setAddress(addr);
      await loadData(addr);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (addr: string) => {
    try {
      setRefreshing(true);
      const [bal, recentTxs] = await Promise.all([
        getAccountBalances(addr),
        getRecentTransactions(addr, 5),
      ]);
      setBalances(bal);
      const native = bal.find(b => b.asset_type === "native");
      setNativeBalance(native?.balance || "0");
      setTransactions(recentTxs);
    } catch (err: any) {
      console.error("Failed to load data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const refresh = () => {
    if (address) loadData(address);
  };

  useEffect(() => {
    loadWallet();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card text-centered">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="card-body mt-4">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card text-centered">
          <Wallet className="w-12 h-12 mx-auto mb-4" />
          <p className="status-error mb-4">{error}</p>
          <button onClick={loadWallet} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="card-title">Wallet</h1>
          <button onClick={refresh} disabled={refreshing} className="btn-secondary p-3">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Balance Card */}
        <div className="card">
          <p className="input-label">Total Balance</p>
          <h2 className="text-4xl font-bold font-mono">{parseFloat(nativeBalance).toFixed(7)} XLM</h2>
          <div className="status-badge text-xs flex items-center gap-2">
            <span className="truncate">{address.slice(0, 8)}...{address.slice(-6)}</span>
            <a href={getStellarExpertUrl("account", address)} target="_blank" rel="noopener noreferrer" className="link-primary">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <Link href="/send" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--background-elevated)] hover:opacity-80 transition">
            <Send className="w-5 h-5" />
            <span className="text-xs">Send</span>
          </Link>
          <Link href="/receive" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--background-elevated)] hover:opacity-80 transition">
            <ArrowDownToLine className="w-5 h-5" />
            <span className="text-xs">Receive</span>
          </Link>
          <Link href="/create" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--background-elevated)] hover:opacity-80 transition">
            <Link2 className="w-5 h-5" />
            <span className="text-xs">Link</span>
          </Link>
          <Link href="/swap" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--background-elevated)] hover:opacity-80 transition">
            <RefreshCw className="w-5 h-5" />
            <span className="text-xs">Swap</span>
          </Link>
        </div>

        {/* Assets */}
        <div className="card">
          <h3 className="font-bold mb-4">Assets</h3>
          {balances.map((b, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-[var(--border-default)] last:border-0">
              <span>{b.asset_type === "native" ? "XLM" : `${b.asset_code} (${b.asset_issuer?.slice(0, 6)}...)`}</span>
              <span className="font-mono">{parseFloat(b.balance).toFixed(7)}</span>
            </div>
          ))}
          {balances.length === 0 && <p className="input-label">No assets found</p>}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h3 className="font-bold mb-4">Recent Activity</h3>
          {transactions.length === 0 ? (
            <p className="input-label">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, i) => (
                <a key={i} href={getStellarExpertUrl("tx", tx.id)} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center py-2 border-b border-[var(--border-default)] last:border-0 hover:opacity-80 transition">
                  <div>
                    <p className="text-sm">{tx.type === "payment" ? "Payment" : tx.type}</p>
                    <p className="text-xs text-[var(--foreground-secondary)]">
                      {tx.from === address ? "To: " + (tx.to ? tx.to.slice(0, 8) + "..." : "unknown") : "From: " + (tx.from ? tx.from.slice(0, 8) + "..." : "unknown")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={tx.from === address ? "text-[var(--error)]" : "text-[var(--success)]"}>
                      {tx.from === address ? "-" : "+"}{tx.amount} {tx.asset_code || "XLM"}
                    </p>
                    <p className="text-xs text-[var(--foreground-secondary)]">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/" className="btn-ghost text-sm">Home</Link>
          <Link href="/claim" className="btn-secondary text-sm">Claim</Link>
        </div>
      </div>
    </div>
  );
}
