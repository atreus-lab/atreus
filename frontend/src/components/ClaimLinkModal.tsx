"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ClaimLinkModalProps {
  show: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onClaim: () => void;
  onClose: () => void;
}

export default function ClaimLinkModal({ show, input, onInputChange, onClaim, onClose }: ClaimLinkModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            className="modal-content max-w-md mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">Claim a Payment Link</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <X className="w-4 h-4 text-secondary" />
              </button>
            </div>
            <p className="text-sm text-secondary">Paste the payment link you received to claim the funds.</p>
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="https://localhost:3000/claim#..."
              className="input"
            />
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-elevated text-secondary transition-colors hover:text-primary">
                Cancel
              </button>
              <button onClick={onClaim} disabled={!input.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--accent-primary)] transition-all">
                Open Claim Page
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
