"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadWallet, getBalance, getBalances, getTransactions, getExplorerUrl } from "@/lib/wallet";
import { Loader2, Wallet, Send, ArrowDownToLine, RefreshCw, ExternalLink, Link2, LogOut, PlusCircle } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (addr: string) => {
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
  }, []);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) {
      router.push("/wallet");
      return;
    }
    const pk = wallet.publicKey;
    setAddress(pk);
    setLoading(true);
    loadData(pk).finally(() => setLoading(false));

    const onFocus = () => loadData(pk);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card text-centered inner-space">
          <Loader2 className="icon-lg icon-spin" />
          <p className="card-body">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (error && !address) {
    return (
      <div className="page">
        <div className="card text-centered inner-space">
          <Wallet className="icon-lg" />
          <p className="status-error">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between content-wide">
        <h1 className="card-title">Wallet</h1>
        <div className="flex-row">
          <button onClick={() => loadData(address)} disabled={refreshing} className="btn-secondary btn-icon-lg">
            <RefreshCw className={`icon-sm ${refreshing ? "icon-spin" : ""}`} />
          </button>
          <Link href="/wallet" className="btn-secondary btn-icon-lg">
            <LogOut className="icon-sm" />
          </Link>
        </div>
      </div>

      <div className="content-wide inner-space">
        {/* Balance */}
        <div className="card">
          <p className="input-label">Total Balance</p>
          <p className="balance-value">{parseFloat(balance).toFixed(7)} XLM</p>
          <div className="status-badge flex-row">
            <span className="mono-text">{address.slice(0, 8)}...{address.slice(-6)}</span>
            <a href={getExplorerUrl("account", address)} target="_blank" rel="noopener noreferrer" className="link-primary">
              <ExternalLink className="icon-sm" />
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="action-grid">
          <Link href="/send" className="action-item">
            <Send className="action-item-icon" />
            <span className="action-item-label">Send</span>
          </Link>
          <Link href="/receive" className="action-item">
            <ArrowDownToLine className="action-item-icon" />
            <span className="action-item-label">Receive</span>
          </Link>
          <Link href="/create" className="action-item">
            <Link2 className="action-item-icon" />
            <span className="action-item-label">Link</span>
          </Link>
          <Link href="/swap" className="action-item">
            <RefreshCw className="action-item-icon" />
            <span className="action-item-label">Swap</span>
          </Link>
        </div>

        {/* Assets */}
        <div className="card">
          <div className="flex-between">
            <h2 className="card-title">Assets</h2>
            <Link href="/assets" className="btn-secondary text-small">
              <PlusCircle className="icon-sm" /> Add Asset
            </Link>
          </div>
          {balances.map((b: any, i: number) => (
            <div key={i} className="flex-between card-padding divider">
              <span>{b.asset_type === "native" ? "XLM" : b.asset_code}</span>
              <span className="font-mono-text">{parseFloat(b.balance).toFixed(7)}</span>
            </div>
          ))}
          {balances.length === 0 && <p className="input-label">Loading assets...</p>}
        </div>

        {/* Transactions */}
        <div className="card">
          <h2 className="card-title">Recent Activity</h2>
          {transactions.length === 0 ? (
            <p className="input-label">No recent activity</p>
          ) : (
            <div className="inner-space-sm">
              {transactions.map((tx: any, i: number) => (
                <a key={i} href={getExplorerUrl("tx", tx.id)} target="_blank" rel="noopener noreferrer" className="flex-between divider card-padding">
                  <div>
                    <p className="text-small">{tx.type === "payment" ? "Payment" : tx.type}</p>
                    <p className="detail-text">
                      {tx.from === address ? "To:" : "From:"} {tx.to?.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-centered">
                    <p className={tx.from === address ? "tx-amount-sent" : "tx-amount-received"}>
                      {tx.from === address ? "-" : "+"}{parseFloat(tx.amount).toFixed(7)} {tx.asset_code || "XLM"}
                    </p>
                    <p className="detail-text">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="nav-row">
          <Link href="/" className="btn-ghost text-small">Home</Link>
          <Link href="/claim" className="btn-secondary text-small">Claim Link</Link>
        </div>
      </div>
    </div>
  );
}
