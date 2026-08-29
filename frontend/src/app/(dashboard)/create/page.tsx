'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Copy, Check, Loader2, ArrowLeft, Mail, Shield, Plus, Trash2, Users } from 'lucide-react';
import { connectWallet, createEscrowTx } from '@/lib/stellar';
import { createSplitLinkTx, type SplitRecipientInput } from '@/lib/splitLinks';
import { saveLink } from '@/lib/links';
import { BatchUpload } from '@/components/BatchUpload';

const EXPIRY_OPTIONS = [
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 5 * 60 },
  { label: '15 minutes', value: 15 * 60 },
  { label: '1 hour', value: 60 * 60 },
  { label: '6 hours', value: 6 * 60 * 60 },
  { label: '24 hours', value: 24 * 60 * 60 },
  { label: '3 days', value: 3 * 24 * 60 * 60 },
  { label: '7 days', value: 7 * 24 * 60 * 60 },
  { label: 'No limit', value: 0 },
];

async function sha256Hash(str: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.toLowerCase().trim());
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

export default function CreatePage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expirySeconds, setExpirySeconds] = useState(7 * 24 * 60 * 60);
  const [link, setLink] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch' | 'split'>('single');

  // Split links (#120): multi-recipient / partial-claim escrow. Recipients are
  // named Stellar Addresses, not bearer secrets, so there's no per-recipient
  // shareable link — everyone opens the same status/claim page.
  const [splitRecipients, setSplitRecipients] = useState<SplitRecipientInput[]>([
    { address: '', amount: '' },
  ]);
  const [splitMinClaimPct, setSplitMinClaimPct] = useState('0');
  const [splitExpirySeconds, setSplitExpirySeconds] = useState(7 * 24 * 60 * 60);
  const [splitLink, setSplitLink] = useState('');
  const [isCreatingSplit, setIsCreatingSplit] = useState(false);
  const [splitError, setSplitError] = useState('');

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setError('');

      const creator = await connectWallet();

      const secretBytes = crypto.getRandomValues(new Uint8Array(32));
      const secretHex = Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const hashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', secretBytes));
      const linkHashHex = Array.from(hashBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Compute SHA-256 hash of recipient email if provided
      let recipientEmailHash: Uint8Array | undefined;
      if (recipientEmail.trim()) {
        recipientEmailHash = await sha256Hash(recipientEmail.trim());
      }

      const expiresAt = expirySeconds === 0
        ? 4102444800 // 2100-01-01 — effectively never expires
        : Math.floor(Date.now() / 1000) + expirySeconds;
      await createEscrowTx(creator, amount, hashBytes, expiresAt, recipientEmailHash);

      const url = new URL(window.location.origin);
      url.pathname = '/claim';
      url.hash = secretHex;
      if (recipientEmail.trim()) {
        url.searchParams.set('email', btoa(recipientEmail.trim()));
      }
      const linkUrl = url.toString();
      setLink(linkUrl);

      saveLink({
        id: secretHex.slice(0, 12),
        url: linkUrl,
        amount,
        secretHex,
        linkHashHex,
        createdAt: Date.now(),
        expiresAt,
        claimed: false,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create link');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateSplitRecipient = (index: number, field: keyof SplitRecipientInput, value: string) => {
    setSplitRecipients((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addSplitRecipient = () => {
    if (splitRecipients.length >= 50) return;
    setSplitRecipients((rows) => [...rows, { address: '', amount: '' }]);
  };

  const removeSplitRecipient = (index: number) => {
    setSplitRecipients((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  };

  const splitTotal = splitRecipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const splitRecipientsValid = splitRecipients.every((r) => r.address.trim() && parseFloat(r.amount) > 0);

  const handleCreateSplit = async () => {
    try {
      setIsCreatingSplit(true);
      setSplitError('');

      const creator = await connectWallet();
      const expiresAt = splitExpirySeconds === 0
        ? 4102444800
        : Math.floor(Date.now() / 1000) + splitExpirySeconds;
      const minClaimBps = Math.round(Math.max(0, Math.min(100, parseFloat(splitMinClaimPct) || 0)) * 100);

      const { id } = await createSplitLinkTx(creator, splitRecipients, expiresAt, minClaimBps);

      const url = new URL(window.location.origin);
      url.pathname = `/claim/split/${id}`;
      setSplitLink(url.toString());
    } catch (err: any) {
      console.error(err);
      setSplitError(err.message || 'Failed to create split link');
    } finally {
      setIsCreatingSplit(false);
    }
  };

  const copySplitLink = () => {
    navigator.clipboard.writeText(splitLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-content max-w-md mx-auto">
      <div className="panel p-8 space-y-5">
        <Link href="/" className="text-sm font-bold text-accent inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <h2 className="text-xl font-bold text-primary">Create Link</h2>

        <div className="grid grid-cols-3 rounded-lg bg-elevated p-1 text-sm font-semibold">
          <button onClick={() => setMode('single')} className={`rounded-md py-2 ${mode === 'single' ? 'bg-[var(--bg-panel)] text-primary shadow-sm' : 'text-secondary'}`}>Single Link</button>
          <button onClick={() => setMode('batch')} className={`rounded-md py-2 ${mode === 'batch' ? 'bg-[var(--bg-panel)] text-primary shadow-sm' : 'text-secondary'}`}>Batch Upload</button>
          <button onClick={() => setMode('split')} className={`rounded-md py-2 ${mode === 'split' ? 'bg-[var(--bg-panel)] text-primary shadow-sm' : 'text-secondary'}`}>Split / Partial</button>
        </div>

        {mode === 'batch' && <BatchUpload />}

        {mode === 'split' && (
          <div className="space-y-5">
            <p className="text-xs text-secondary">
              Fund once and disburse to one or more Stellar addresses. One recipient with several partial
              claims is <em>partial claims</em> mode; several recipients each with a share is <em>split recipients</em> mode.
              You (the sender) can cancel and reclaim whatever is unclaimed any time before expiry.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary block">Recipients</label>
              {splitRecipients.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={r.address}
                    onChange={(e) => updateSplitRecipient(i, 'address', e.target.value)}
                    placeholder="Stellar address (G...)"
                    className="input flex-1 text-xs font-mono"
                    disabled={isCreatingSplit}
                  />
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      value={r.amount}
                      onChange={(e) => updateSplitRecipient(i, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="input"
                      disabled={isCreatingSplit}
                    />
                  </div>
                  <button
                    onClick={() => removeSplitRecipient(i)}
                    disabled={isCreatingSplit || splitRecipients.length === 1}
                    className="p-2.5 rounded-lg bg-elevated text-secondary disabled:opacity-30 hover:text-error transition-colors"
                    title="Remove recipient"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addSplitRecipient}
                disabled={isCreatingSplit || splitRecipients.length >= 50}
                className="text-xs font-semibold text-accent inline-flex items-center gap-1 hover:underline disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add recipient
              </button>
              <p className="text-xs text-secondary">Total escrowed: {splitTotal || 0} XLM</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-secondary block">
                Minimum partial claim <span className="font-normal">(% of each recipient&apos;s share; 0 = no minimum)</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={splitMinClaimPct}
                onChange={(e) => setSplitMinClaimPct(e.target.value)}
                className="input"
                disabled={isCreatingSplit}
              />
              <p className="text-xs text-secondary">
                A recipient can always claim their exact remaining balance in one transaction, regardless of this floor.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-secondary block">Expires in (cancel window)</label>
              <select
                value={splitExpirySeconds}
                onChange={(e) => setSplitExpirySeconds(Number(e.target.value))}
                className="input"
                disabled={isCreatingSplit}
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {splitError && (
              <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-error">
                {splitError}
              </div>
            )}

            <button
              onClick={handleCreateSplit}
              className="btn-primary w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
              disabled={isCreatingSplit || !splitRecipientsValid}
            >
              {isCreatingSplit ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                <><Users className="w-4 h-4" /> Create Split Link</>
              )}
            </button>

            {splitLink && (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg p-3 bg-elevated border border-[var(--border-default)]">
                  <p className="text-xs font-semibold text-secondary mb-2">Share this status/claim link with every recipient:</p>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={splitLink} className="input flex-1 text-xs font-mono" />
                    <button
                      onClick={copySplitLink}
                      className="p-2.5 rounded-lg bg-[rgba(59,130,246,0.08)] text-accent border border-[rgba(59,130,246,0.1)] transition-colors hover:bg-[rgba(59,130,246,0.12)]"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-elevated text-secondary transition-colors hover:text-primary"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'single' && <>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-secondary block">Amount (XLM)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input"
            disabled={isCreating}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-secondary block">Expires in</label>
          <select
            value={expirySeconds}
            onChange={(e) => setExpirySeconds(Number(e.target.value))}
            className="input"
            disabled={isCreating}
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-secondary flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Recipient Email <span className="text-secondary font-normal">(optional — only this person can claim)</span>
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="alice@example.com"
            className="input"
            disabled={isCreating}
          />
          {recipientEmail.trim() && (
            <div className="space-y-1 mt-1">
              <p className="flex items-center gap-1 text-xs text-amber-500">
                <Shield className="w-3 h-3" /> Only {recipientEmail.trim()} will be able to claim this link
              </p>
              <p className="text-xs text-secondary">
                The recipient must prove email ownership with a DKIM-signed verification message before the attester will approve the claim.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-error">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          className="btn-primary w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
          disabled={isCreating || !amount || parseFloat(amount) <= 0}
        >
          {isCreating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            'Generate Link'
          )}
        </button>

        {link && (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg p-3 bg-elevated border border-[var(--border-default)]">
              <p className="text-xs font-semibold text-secondary mb-2">Share this link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={link}
                  className="input flex-1 text-xs font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 rounded-lg bg-[rgba(59,130,246,0.08)] text-accent border border-[rgba(59,130,246,0.1)] transition-colors hover:bg-[rgba(59,130,246,0.12)]"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-elevated text-secondary transition-colors hover:text-primary"
            >
              Back to Dashboard
            </button>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
