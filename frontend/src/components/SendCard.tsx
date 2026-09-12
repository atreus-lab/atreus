"use client";

import { useCallback, useEffect, useState } from "react";
import { Wand, Mail, TextCursorInput, ArrowRight, ArrowLeft, Check, Loader2, ExternalLink } from "lucide-react";
import { sendXLM, getBalance, getExplorerUrl } from "@/lib/wallet";
import { getXlmUsdPrice } from "@/lib/prices";
import CreateLinkCard from "./CreateLinkCard";

type Mode = "menu" | "address" | "link" | "email";

interface SendCardProps {
  publicKey: string;
  onBack: () => void;
  onSent?: () => void;
  initialDestination?: string;
}

export default function SendCard({ publicKey, onBack, onSent, initialDestination }: SendCardProps) {
  const [mode, setMode] = useState<Mode>("menu");
  const [destination, setDestination] = useState(initialDestination ?? "");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [xlmUsd, setXlmUsd] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    getBalance(publicKey).then(setBalance).catch(() => {});
    getXlmUsdPrice().then(setXlmUsd);
  }, [publicKey]);

  const handleSend = useCallback(async () => {
    try {
      setStatus("sending");
      setErrorMsg("");
      if (!destination.trim()) throw new Error("Enter a destination address");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");
      if (parseFloat(balance) < parseFloat(amount) + 0.001) throw new Error("Insufficient balance");
      const hash = await sendXLM(destination.trim(), amount);
      setTxHash(hash);
      setStatus("success");
      onSent?.();
    } catch (err: any) {
      setErrorMsg(err.message || "Send failed");
      setStatus("error");
    }
  }, [destination, amount, balance, onSent]);

  const menuRow = (icon: React.ReactNode, title: string, desc: string, onClick: () => void) => (
    <div className="group w-full overflow-hidden">
      <div onClick={onClick} className="flex w-full cursor-pointer items-center justify-start whitespace-normal break-words px-4 py-3.5">
        <div className="flex w-full items-start justify-start gap-3">
          <div className="flex w-5 items-center justify-center pt-1 text-grey-800">{icon}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
            <h3 className="text-left text-sm font-semibold text-grey-800 mobile:text-base">{title}</h3>
            <div className="text-left text-xs font-normal text-grey-500">{desc}</div>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 flex-shrink-0 text-grey-800" />
      </div>
    </div>
  );

  if (mode === "link" || mode === "email") {
    return (
      <CreateLinkCard
        publicKey={publicKey}
        showEmail={mode === "email"}
        requireEmail={mode === "email"}
        onBack={() => setMode("menu")}
        onCreated={onSent}
      />
    );
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="flex flex-col items-center py-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success text-white shadow-[0_8px_24px_rgba(22,163,74,0.25)]">
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-grey-800">Send Successful</h3>
          <p className="mb-8 text-sm text-grey-500">Successfully sent {amount} XLM to {destination.slice(0, 5)}...{destination.slice(-4)}</p>
          <div className="flex items-center gap-3">
            <button onClick={() => { setMode("address"); setStatus("idle"); setAmount(""); setDestination(""); }} className="flex h-11 items-center gap-2 rounded-lg bg-primaryBlue px-4 font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700">Send Again</button>
            <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center gap-2 rounded-lg border border-[#E0E7EB] px-4 font-medium text-grey-700 transition-colors hover:bg-grey-50">View Explorer <ExternalLink className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "menu") {
    return (
      <div className="text-center">
        <div className="flex-col">
          <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Send</h4>
          <p className="mb-4 text-left text-sm font-normal text-grey-700 mobile:text-base">Send funds by creating a new payment link:</p>
          <div className="mt-4 overflow-hidden rounded-lg border border-grey-100 bg-white">
            {menuRow(<Wand className="h-[22px] w-[22px]" />, "As a Link or QR", "Create a new payment link and share via a simple link or QR code.", () => setMode("link"))}
            <hr className="m-0 border-t border-grey-100" />
            {menuRow(<Mail className="h-[22px] w-[22px]" />, "To Email", "Create a new payment link and send to a person via their email address.", () => setMode("email"))}
          </div>
          <p className="my-4 text-left text-sm font-normal text-grey-700">or send to an existing wallet:</p>
          <div className="overflow-hidden rounded-lg border border-grey-100 bg-white">
            {menuRow(<TextCursorInput className="h-5 w-5" />, "To Stellar wallet address", "Send funds to a wallet address you specify.", () => setMode("address"))}
          </div>
          <div className="flex w-full items-center justify-between gap-2 pt-[15px]">
            <div className="w-full mobile:w-max">
              <button onClick={onBack} className="h-11 w-full rounded-lg border border-[#E0E7EB] px-3 text-sm font-medium text-grey-700 hover:bg-grey-50 mobile:w-max mobile:text-base">Cancel</button>
</div>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="text-center">
      <div className="flex-col">
        <button onClick={() => setMode("menu")} className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Send to Stellar Wallet Address</h4>
        <p className="mb-4 text-left text-sm font-normal text-grey-700 mobile:text-base">Send funds to a wallet address you specify:</p>

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
            <div className="absolute bottom-2 text-xs text-grey-400">
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

        <div className="chakra-input__group my-2 flex w-full flex-col">
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="Enter Stellar wallet address"
            className="!h-11 w-full rounded-lg border border-solid border-grey-100 !bg-white px-4 py-2 text-left text-grey-800 outline-none focus:border-[#007CBF]"
          />
        </div>

        <div className="mb-4 text-left text-xs text-grey-400">Available: {parseFloat(balance).toFixed(2)} XLM</div>

        {status === "error" && (
          <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.15)] bg-[rgba(248,113,113,0.08)] p-3 text-sm font-semibold text-error">{errorMsg}</div>
        )}

        <div className="flex w-full items-center justify-between gap-2 pt-[15px]">
          <div className="w-full mobile:w-max">
            <button onClick={() => setMode("menu")} className="h-11 w-full rounded-lg border border-[#E0E7EB] px-3 text-sm font-medium text-grey-700 hover:bg-grey-50 mobile:w-max mobile:text-base">Cancel</button>
          </div>
          <div className="w-full mobile:w-max">
            <button
              onClick={handleSend}
              disabled={status === "sending" || !destination || !amount || parseFloat(amount) <= 0}
              className="flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-primaryBlue px-3 font-bold text-white transition duration-150 ease-out hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 mobile:w-max"
            >
              {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="font-bold">{status === "sending" ? "Sending..." : "Confirm Send"}</span>
            </button>
          </div>
</div>
        </div>
      </div>
    );
  }