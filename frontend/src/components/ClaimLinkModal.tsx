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
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 w-full max-w-md mx-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">Claim a Payment Link</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-sm text-slate-500">Paste the payment link you received to claim the funds.</p>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="https://localhost:3000/claim#..."
          className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={onClaim} disabled={!input.trim()} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
            Open Claim Page
          </button>
        </div>
      </div>
    </div>
  );
}
