"use client";

import { X } from "lucide-react";

interface ClaimLinkModalProps {
  show: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onClaim: () => void;
  onClose: () => void;
}

export default function ClaimLinkModal({ show, input, onInputChange, onClaim, onClose }: ClaimLinkModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="rounded-[2rem] p-8 w-full max-w-md mx-4 space-y-5" style={{ background: 'var(--background-card)', border: '1px solid var(--border-default)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold" style={{ color: 'var(--foreground-primary)' }}>Claim a Payment Link</h3>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--foreground-secondary)' }}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-sm text-slate-500">Paste the payment link you received to claim the funds.</p>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="https://localhost:3000/claim#..."
          className="w-full px-5 py-4 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4" style={{ background: 'var(--background-elevated)', border: '2px solid var(--border-default)', color: 'var(--foreground-primary)' }}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-bold transition-colors" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-secondary)' }}>
            Cancel
          </button>
          <button onClick={onClaim} disabled={!input.trim()} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all" style={{ background: 'var(--accent-primary)' }}>
            Open Claim Page
          </button>
        </div>
      </div>
    </div>
  );
}
