'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Copy, Check, Loader2, ArrowLeft, Mail, Shield } from 'lucide-react';
import { connectWallet, createEscrowTx } from '@/lib/stellar';
import { saveLink } from '@/lib/links';

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
    <>
      <div className="w-full max-w-md mx-auto rounded-[2rem] p-8 space-y-6" style={{ background: 'var(--background-card)', border: '1px solid var(--border-default)' }}>
        <Link
          href="/"
          className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <h2 className="text-xl font-extrabold" style={{ color: 'var(--foreground-primary)' }}>Create Link</h2>

        <div>
          <label className="text-sm font-semibold text-slate-500 block mb-1.5">Amount (XLM)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full p-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-4" style={{ background: 'var(--background-elevated)', border: '2px solid var(--border-default)', color: 'var(--foreground-primary)',  }}
            disabled={isCreating}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500 block mb-1.5">Expires in</label>
          <select
            value={expirySeconds}
            onChange={(e) => setExpirySeconds(Number(e.target.value))}
            className="w-full p-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-4" style={{ background: 'var(--background-elevated)', border: '2px solid var(--border-default)', color: 'var(--foreground-primary)',  }}
            disabled={isCreating}
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-500 block mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Recipient Email <span className="text-slate-300 font-normal">(optional — only this person can claim)</span>
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="alice@example.com"
            className="w-full p-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-4" style={{ background: 'var(--background-elevated)', border: '2px solid var(--border-default)', color: 'var(--foreground-primary)',  }}
            disabled={isCreating}
          />
          {recipientEmail.trim() && (
            <p className="flex items-center gap-1 text-xs font-medium text-amber-600 mt-1.5">
              <Shield className="w-3 h-3" /> Only {recipientEmail.trim()} will be able to claim this link
            </p>
          )}
        </div>

        {error && (
          <div className="text-sm font-medium p-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--error)' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
          disabled={isCreating || !amount || parseFloat(amount) <= 0}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating...
            </>
          ) : (
            'Generate Link'
          )}
        </button>

        {link && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl p-4" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs font-semibold text-slate-500 mb-2">Share this link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={link}
                  className="flex-1 p-2.5 rounded-lg text-xs font-mono" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', color: 'var(--foreground-primary)' }}
                />
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 rounded-2xl text-sm font-bold transition-colors" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-secondary)' }}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </>
  );
}
