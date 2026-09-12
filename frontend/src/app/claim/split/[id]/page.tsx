'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Users } from 'lucide-react';
import { connectWallet } from '@/lib/stellar';
import {
  getSplitLinkStatus,
  claimSplitTx,
  cancelSplitLinkTx,
  refundSplitLinkTx,
  type SplitLinkStatus,
} from '@/lib/splitLinks';

// Split links (#120) have no bearer secret — a recipient is a named Stellar
// Address chosen by the sender at creation, so claiming is just "connect the
// wallet at that address and sign". There is no ZK proof step for the
// default (non-email-restricted) policy. See docs/architecture.md §5.1.

const STROOPS_PER_XLM = BigInt(10_000_000);

function stroopsToXlm(stroops: string): string {
  const n = BigInt(stroops);
  const whole = n / STROOPS_PER_XLM;
  const frac = (n % STROOPS_PER_XLM).toString().padStart(7, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

export default function SplitClaimPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [status, setStatus] = useState<SplitLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [claimAmount, setClaimAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [txHash, setTxHash] = useState('');

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const info = await getSplitLinkStatus(id);
      setStatus(info);
      setLoadError(info ? '' : 'Split link not found');
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load split link');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleConnect = async () => {
    try {
      const pk = await connectWallet();
      setPublicKey(pk);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to connect wallet');
    }
  };

  const myRecipient = status?.recipients.find((r) => r.address === publicKey) || null;
  const myRemaining = myRecipient ? BigInt(myRecipient.allocated) - BigInt(myRecipient.claimed) : BigInt(0);
  const isCreatorView = publicKey !== null && !myRecipient; // best-effort: cancel/refund are auth-checked on-chain regardless
  const now = Math.floor(Date.now() / 1000);
  const isExpired = status ? now > Number(status.expiresAt) : false;

  const handleClaim = async () => {
    if (!publicKey || !status) return;
    setBusy(true);
    setActionError('');
    setTxHash('');
    try {
      const hash = await claimSplitTx(publicKey, id, claimAmount);
      setTxHash(hash);
      setClaimAmount('');
      await refresh();
    } catch (err: any) {
      setActionError(err?.message || 'Claim failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!publicKey) return;
    setBusy(true);
    setActionError('');
    setTxHash('');
    try {
      const hash = await cancelSplitLinkTx(publicKey, id);
      setTxHash(hash);
      await refresh();
    } catch (err: any) {
      setActionError(err?.message || 'Cancel failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    if (!publicKey) return;
    setBusy(true);
    setActionError('');
    setTxHash('');
    try {
      const hash = await refundSplitLinkTx(publicKey, id);
      setTxHash(hash);
      await refresh();
    } catch (err: any) {
      setActionError(err?.message || 'Refund failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-content max-w-md mx-auto">
      <div className="panel p-8 space-y-5">
        <Link href="/" className="text-sm font-bold text-accent inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-bold text-primary">Split Payment Link</h2>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-secondary text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading link…
          </div>
        )}

        {!loading && loadError && (
          <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-error flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {loadError}
          </div>
        )}

        {!loading && status && (
          <>
            <div className="rounded-lg p-3 bg-elevated border border-[var(--border-default)] space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-secondary">Total escrowed</span><span className="font-mono text-primary">{stroopsToXlm(status.amount)} XLM</span></div>
              <div className="flex justify-between"><span className="text-secondary">Recipients</span><span className="font-mono text-primary">{status.recipients.length}</span></div>
              <div className="flex justify-between"><span className="text-secondary">Status</span><span className="font-mono text-primary">{status.closed ? 'Closed' : isExpired ? 'Expired' : 'Active'}</span></div>
            </div>

            <div className="space-y-1.5">
              {status.recipients.map((r) => {
                const mine = r.address === publicKey;
                return (
                  <div
                    key={r.address}
                    className={`rounded-lg p-2.5 border text-xs font-mono flex justify-between items-center ${mine ? 'border-accent bg-[rgba(59,130,246,0.06)]' : 'border-[var(--border-default)]'}`}
                  >
                    <span className="truncate max-w-[10rem]">{r.address}{mine ? ' (you)' : ''}</span>
                    <span>{stroopsToXlm(r.claimed)} / {stroopsToXlm(r.allocated)} XLM</span>
                  </div>
                );
              })}
            </div>

            {!publicKey ? (
              <button onClick={handleConnect} className="btn-primary w-full py-3 rounded-lg text-sm font-bold">
                Connect Wallet
              </button>
            ) : (
              <>
                {myRecipient && myRemaining > BigInt(0) && !status.closed && !isExpired && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-secondary block">
                      Claim amount (XLM) — up to {stroopsToXlm(myRemaining.toString())}
                    </label>
                    <input
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder={stroopsToXlm(myRemaining.toString())}
                      className="input"
                      disabled={busy}
                    />
                    <button
                      onClick={handleClaim}
                      disabled={busy || !claimAmount || parseFloat(claimAmount) <= 0}
                      className="btn-primary w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    >
                      {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Claiming…</> : 'Claim My Share'}
                    </button>
                  </div>
                )}

                {myRecipient && myRemaining === BigInt(0) && (
                  <p className="text-sm text-secondary">You have claimed your full allocation.</p>
                )}

                {!myRecipient && (
                  <p className="text-sm text-secondary">
                    {publicKey} isn&apos;t a recipient of this link. If you created it, you can cancel or refund it below.
                  </p>
                )}

                {isCreatorView && !status.closed && (
                  <div className="flex gap-3 pt-1">
                    {!isExpired && (
                      <button onClick={handleCancel} disabled={busy} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-elevated text-secondary transition-colors hover:text-primary">
                        Cancel &amp; reclaim unclaimed
                      </button>
                    )}
                    {isExpired && (
                      <button onClick={handleRefund} disabled={busy} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-elevated text-secondary transition-colors hover:text-primary">
                        Refund unclaimed remainder
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {actionError && (
              <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-error">
                {actionError}
              </div>
            )}

            {txHash && (
              <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.15)] text-success flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Transaction submitted: <span className="font-mono text-xs truncate">{txHash}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
