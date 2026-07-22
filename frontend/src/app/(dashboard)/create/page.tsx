'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Copy, Check, Loader2, ArrowLeft, Mail, Shield } from 'lucide-react';
import { connectWallet, createEscrowTx } from '@/lib/stellar';
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
  const [mode, setMode] = useState<'single' | 'batch'>('single');

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

  return (
    <div className="app-content max-w-md mx-auto">
      <div className="panel p-8 space-y-5">
        <Link href="/" className="text-sm font-bold text-accent inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <h2 className="text-xl font-bold text-primary">Create Link</h2>

        <div className="grid grid-cols-2 rounded-lg bg-elevated p-1 text-sm font-semibold">
          <button onClick={() => setMode('single')} className={`rounded-md py-2 ${mode === 'single' ? 'bg-[var(--bg-panel)] text-primary shadow-sm' : 'text-secondary'}`}>Single Link</button>
          <button onClick={() => setMode('batch')} className={`rounded-md py-2 ${mode === 'batch' ? 'bg-[var(--bg-panel)] text-primary shadow-sm' : 'text-secondary'}`}>Batch Upload</button>
        </div>

        {mode === 'batch' ? <BatchUpload /> : <>

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
