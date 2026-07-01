"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getBalance, getBalances, getTransactions, getExplorerUrl } from "@/lib/wallet";
import { Loader2, Wallet, Send, ArrowDownToLine, RefreshCw, ExternalLink, Link2, LogOut } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = async (addr: string) => {
    try {
      setRefreshing(true);
      const [bal, bals, txs] = await Promise.all([
        getBalance(addr),
        getBalances(addr),
        getTransactions(addr, 5),
      ]);
      setBalance(bal);
      setBalances(bals);
      setTransactions(txs);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) {
      router.push("/wallet");
      return;
    }
    setAddress(wallet.publicKey);
    setLoading(true);
    loadData(wallet.publicKey).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card text-centered">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="card-body mt-4">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (error && !address) {
    return (
      <div className="page">
        <div className="card text-centered">
          <Wallet className="w-12 h-12 mx-auto mb-4" />
          <p className="status-error mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
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
          <div className="flex gap-2">
            <button onClick={() => loadData(address)} disabled={refreshing} className="btn-secondary p-3">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link href="/wallet" className="btn-secondary p-3">
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Balance */}
        <div className="card">
          <p className="input-label">Total Balance</p>
          <h2 className="text-4xl font-bold font-mono">{parseFloat(balance).toFixed(7)} XLM</h2>
          <div className="status-badge text-xs flex items-center gap-2 mt-4">
            <span className="truncate">{address.slice(0, 8)}...{address.slice(-6)}</span>
            <a href={getExplorerUrl("account", address)} target="_blank" rel="noopener noreferrer" className="link-primary">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Actions */}
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
          {balances.map((b: any, i: number) => (
            <div key={i} className="flex justify-between py-2 border-b border-[var(--border-default)] last:border-0">
              <span>{b.asset_type === "native" ? "XLM" : `${b.asset_code}`}</span>
              <span className="font-mono">{parseFloat(b.balance).toFixed(7)}</span>
            </div>
          ))}
          {balances.length === 0 && <p className="input-label">Loading assets...</p>}
        </div>

        {/* Transactions */}
        <div className="card">
          <h3 className="font-bold mb-4">Recent Activity</h3>
          {transactions.length === 0 ? (
            <p className="input-label">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any, i: number) => (
                <a key={i} href={getExplorerUrl("tx", tx.id)} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center py-2 border-b border-[var(--border-default)] last:border-0 hover:opacity-80 transition">
                  <div>
                    <p className="text-sm">{tx.type === "payment" ? "Payment" : tx.type}</p>
                    <p className="text-xs text-[var(--foreground-secondary)]">
                      {tx.from === address ? `To: ${tx.to?.slice(0, 8)}...` : `From: ${tx.from?.slice(0, 8)}...`}
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
          <Link href="/claim" className="btn-secondary text-sm">Claim Link</Link>
        </div>
      </div>
    </div>
  );
}
