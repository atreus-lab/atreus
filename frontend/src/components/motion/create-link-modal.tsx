"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, Loader2, ArrowLeft, Mail, Shield, X, Link2 } from 'lucide-react';
import { connectWallet, createEscrowTx } from '@/lib/stellar';
import { saveLink } from '@/lib/links';
import { EASE_OUT, SPRING_PANEL, SPRING_PRESS } from "@/lib/ease";

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

interface CreateLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLinkModal({ open, onOpenChange }: CreateLinkModalProps) {
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

      let recipientEmailHash: Uint8Array | undefined;
      if (recipientEmail.trim()) {
        recipientEmailHash = await sha256Hash(recipientEmail.trim());
      }

      const expiresAt = expirySeconds === 0
        ? 4102444800
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

  const reset = () => {
    setAmount('');
    setRecipientEmail('');
    setExpirySeconds(7 * 24 * 60 * 60);
    setLink('');
    setError('');
    setCopied(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.93, y: 12, filter: "blur(6px)" }}
            transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md mx-4"
          >
            <div className="bg-[var(--background-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-primary">Create Payment Link</h2>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_PRESS}
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <X className="w-4 h-4 text-secondary" />
                </motion.button>
              </div>

              {!link ? (
                <>
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
                      <Mail className="w-3.5 h-3.5" /> Recipient Email <span className="text-secondary font-normal">(optional)</span>
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
                      <p className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                        <Shield className="w-3 h-3" /> Only {recipientEmail.trim()} will be able to claim
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="text-sm font-semibold p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] text-error">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING_PRESS}
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-elevated text-secondary transition-colors hover:text-primary"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING_PRESS}
                      onClick={handleCreate}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--accent-primary)] transition-all flex items-center justify-center gap-2"
                      disabled={isCreating || !amount || parseFloat(amount) <= 0}
                    >
                      {isCreating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Link2 className="w-4 h-4" /> Generate Link</>
                      )}
                    </motion.button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl p-4 bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.15)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm font-bold text-success">Link Created Successfully!</span>
                    </div>
                  </div>

                  <div className="rounded-lg p-3 bg-elevated border border-[var(--border-default)]">
                    <p className="text-xs font-semibold text-secondary mb-2">Share this link:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={link}
                        className="input flex-1 text-xs font-mono"
                      />
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        transition={SPRING_PRESS}
                        onClick={copyToClipboard}
                        className="p-2.5 rounded-lg bg-[rgba(59,130,246,0.08)] text-accent border border-[rgba(59,130,246,0.1)] transition-colors hover:bg-[rgba(59,130,246,0.12)]"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </motion.button>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING_PRESS}
                    onClick={handleClose}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-elevated text-secondary transition-colors hover:text-primary"
                  >
                    Done
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
