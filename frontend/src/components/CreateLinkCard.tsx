"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Copy } from "lucide-react";
import { getBalance } from "@/lib/wallet";
import { getXlmUsdPrice } from "@/lib/prices";
import { createEscrowTx } from "@/lib/stellar";
import { saveLink } from "@/lib/links";

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

interface CreateLinkCardProps {
  publicKey: string;
  showEmail?: boolean;
  requireEmail?: boolean;
  onBack: () => void;
  onCreated?: () => void;
}

export default function CreateLinkCard({ publicKey, showEmail, requireEmail, onBack, onCreated }: CreateLinkCardProps) {
  const [amount, setAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [expirySeconds, setExpirySeconds] = useState(7 * 24 * 60 * 60);
  const [balance, setBalance] = useState("0");
  const [xlmUsd, setXlmUsd] = useState(0);
  const [status, setStatus] = useState<"idle" | "creating" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getBalance(publicKey).then(setBalance).catch(() => {});
    getXlmUsdPrice().then(setXlmUsd);
  }, [publicKey]);

  const handleCreate = useCallback(async () => {
    try {
      setStatus("creating");
      setErrorMsg("");

      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");
      if (requireEmail && !recipientEmail.trim()) throw new Error("Enter an email address");

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

      await createEscrowTx(publicKey, amount, hashBytes, expiresAt, recipientEmailHash);

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

      navigator.clipboard.writeText(linkUrl).catch(() => {});
      setCopied(true);
      setStatus("success");
      onCreated?.();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create link");
      setStatus("error");
    }
  }, [publicKey, amount, requireEmail, recipientEmail, expirySeconds, onCreated]);

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="flex flex-col items-center px-2 py-10">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <Check className="h-10 w-10 text-success" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-bold text-grey-800">Link Created</h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-grey-500">
            Your <span className="font-bold text-grey-800">{amount} XLM</span> payment link is ready to share
            {recipientEmail.trim() ? ` with ${recipientEmail.trim()}` : ""}.
          </p>

          <div className="mt-7 w-full max-w-md">
            <div className="flex flex-col gap-3 rounded-xl border border-grey-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-grey-500">Payment Link</span>
                {copied ? (
                  <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
                    <Check className="h-3 w-3" strokeWidth={3} /> Copied
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">Auto-copied</span>
                )}
              </div>
              <p className="break-all text-left font-mono text-xs font-medium leading-relaxed text-grey-700">{link}</p>
              <button
                onClick={copyLink}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primaryBlue text-sm font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied to Clipboard" : "Copy Link"}
              </button>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">
            <button onClick={() => { setStatus("idle"); setAmount(""); setRecipientEmail(""); setLink(""); }} className="flex h-11 items-center gap-2 rounded-lg bg-primaryBlue px-4 font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700">Create Another</button>
            <button onClick={onBack} className="flex h-11 items-center rounded-lg border border-[#E0E7EB] px-4 font-medium text-grey-700 transition-colors hover:bg-grey-50">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex-col">
        <button onClick={onBack} className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Create Link</h4>
        <p className="mb-4 text-left text-sm font-normal text-grey-700 mobile:text-base">Create a new payment link and share via a simple link or QR code.</p>

        <div className="overflow-hidden rounded-lg border border-grey-100 bg-white">
          <div className="relative flex min-h-[80px] items-center justify-center space-x-1 border-b border-grey-100 py-1 pb-5">
            <input
              inputMode="decimal"
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="$0 USD"
              className="w-full border-none py-2 text-center text-3xl font-light outline-none text-grey-900"
            />
            <div className="absolute bottom-2 text-xs text-grey-500">
              <span>~{amount && parseFloat(amount) > 0 ? (xlmUsd > 0 ? (parseFloat(amount) / xlmUsd).toFixed(2) : "0.00") : "0.00"} XLM</span>
            </div>
            <button
              onClick={() => setAmount(balance)}
              className="absolute right-[48px] top-1/2 flex h-8 min-h-8 w-8 min-w-8 -translate-y-1/2 cursor-pointer select-none items-center justify-center rounded-full bg-grey-50 py-2 text-[11px] font-semibold text-grey-600 hover:bg-grey-100 active:bg-grey-200 mobile:right-[60px] mobile:h-9 mobile:min-h-9 mobile:w-9 mobile:min-w-9"
            >
              Max
            </button>
          </div>
          <div className="flex w-full">
            {[1, 2, 5].map(v => (
              <button
                key={v}
                onClick={() => setAmount(xlmUsd > 0 ? (v / xlmUsd).toFixed(2) : String(v))}
                className="flex w-full items-center justify-center border-b border-r border-grey-100 bg-white py-2 text-sm font-semibold text-grey-800 first:rounded-bl-lg first:border-l last:rounded-br-lg hover:bg-grey-25 active:bg-grey-50"
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        <div className="my-3 flex items-center justify-center rounded-lg border border-grey-100 bg-white px-6 py-2 hover:border-grey-500 hover:bg-grey-25">
          <span className="pr-2 text-grey-800">Expires:</span>
          <select
            value={expirySeconds}
            onChange={e => setExpirySeconds(Number(e.target.value))}
            className="h-9 cursor-pointer rounded-lg border-none bg-white font-semibold text-grey-800 outline-none"
            disabled={status === "creating"}
          >
            {EXPIRY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {showEmail && (
          <div className="chakra-input__group my-2 flex w-full flex-col">
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="Enter email address"
              className="!h-11 w-full rounded-lg border border-solid border-grey-100 !bg-white px-4 py-2 text-left text-grey-800 outline-none focus:border-[#007CBF]"
            />
          </div>
        )}

        {status === "error" && (
          <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.08)] p-3 text-sm font-semibold text-error">{errorMsg}</div>
        )}

        <p className="pt-2 text-center text-xs leading-none text-grey-700 mobile:text-right">Your link will automatically be copied to clipboard.</p>

        <div className="flex w-full items-center justify-between gap-2 pt-[15px]">
          <div className="w-full mobile:w-max">
            <button onClick={onBack} className="h-11 w-full rounded-lg border border-[#E0E7EB] px-3 text-sm font-medium text-grey-700 hover:bg-grey-50 mobile:w-max mobile:text-base">Cancel</button>
          </div>
          <div className="w-full mobile:w-max">
            <button
              onClick={handleCreate}
              disabled={status === "creating" || !amount || parseFloat(amount) <= 0 || (requireEmail && !recipientEmail.trim())}
              className="flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-primaryBlue px-3 font-bold text-white transition duration-150 ease-out hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 mobile:w-max"
            >
              {status === "creating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="font-bold">{status === "creating" ? "Creating..." : "Create Link"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}