"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { CreditCard, Wallet, KeyRound, ArrowRight, X, Copy, Check, Info, ExternalLink } from "lucide-react";
import { getExplorerUrl } from "@/lib/wallet";

interface AddFundsCardProps {
  publicKey: string;
  onBack: () => void;
}

export default function AddFundsCard({ publicKey, onBack }: AddFundsCardProps) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuRow = (icon: React.ReactNode, title: React.ReactNode, desc: string, onClick: () => void) => (
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

  return (
    <>
      <div className="text-center">
        <div className="flex-col">
          <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Add Funds</h4>
          <div className="!divide-y !divide-grey-100 !overflow-hidden rounded-lg !border-[1.5px] !border-grey-100">
            {menuRow(
              <CreditCard className="h-5 w-5 flex-shrink-0 text-grey-800" />,
              <div className="flex flex-row flex-wrap items-center gap-1 pb-1">With Bank/Card</div>,
              "Buy more crypto via Coinbase or Moonpay.",
              () => setShowQr(true)
            )}
            {menuRow(
              <Wallet className="h-5 w-5 flex-shrink-0 text-grey-800" />,
              <div className="inline-flex flex-wrap items-center gap-1 pb-1">From External Account/Wallet</div>,
              "Deposit assets from your connected wallet or from your Coinbase account.",
              () => setShowQr(true)
            )}
            {menuRow(
              <KeyRound className="h-5 w-5 flex-shrink-0 text-grey-800" />,
              <div className="inline-flex flex-wrap items-center gap-1 pb-1">To This Stellar Wallet Address</div>,
              "Deposit assets via this Stellar wallet address.",
              () => setShowQr(true)
            )}
          </div>
          <div className="flex w-full items-center justify-between gap-2 pt-[15px]">
            <div className="w-full mobile:w-max">
              <button onClick={onBack} className="h-11 w-full rounded-lg border border-[#E0E7EB] px-3 text-sm font-medium text-grey-700 hover:bg-grey-50 mobile:w-max mobile:text-base">Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {showQr && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <section className="flex w-full max-w-[500px] flex-col items-center rounded-xl bg-white px-5 py-10 text-center shadow-2xl mobile:px-10">
            <div className="absolute right-[10px] top-[10px] cursor-pointer text-grey-600 hover:text-grey-800" onClick={() => setShowQr(false)}>
              <X className="h-5 w-5" />
            </div>
            <header className="mb-6">
              <p className="mb-2 text-center text-xl font-bold text-grey-900 mobile:text-[26px]">Your Wallet Address</p>
              <p className="text-center text-xs font-normal text-grey-800 sm:text-base">You can deposit crypto or NFTs into your account via this Stellar wallet address:</p>
            </header>
            <div className="flex w-full flex-col items-center justify-center rounded-lg bg-grey-25 px-9 py-8">
              <div className="mb-5 rounded-lg bg-white p-3">
                <QRCode value={publicKey} size={200} level="Q" fgColor="#0f172a" />
              </div>
              <div className="relative flex h-12 w-full cursor-pointer items-center justify-between rounded-full border border-grey-100 bg-white px-4">
                <div className="w-full text-center font-mono text-sm font-semibold text-grey-900">
                  {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
                </div>
                <button onClick={copyAddress} className="absolute right-[2px] top-1/2 flex h-[42px] min-h-[42px] w-[42px] min-w-[42px] -translate-y-1/2 items-center justify-center rounded-full bg-[#007CBF] hover:bg-blue-600 active:bg-blue-700">
                  {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4 text-white" />}
                </button>
              </div>
              <div className="flex w-full items-start justify-center pt-4 text-grey-600">
                <Info className="h-[14.67px] w-[14.67px] flex-shrink-0" stroke="#6B818C" />
                <span className="ml-1 text-xs font-normal">Only send crypto to this address via the Stellar network.</span>
              </div>
            </div>
            <div className="mt-6 flex w-full flex-col items-center gap-2 mobile:flex-row">
              <a href={getExplorerUrl("account", publicKey)} target="_blank" rel="noopener noreferrer" className="flex h-11 w-full items-center justify-center rounded-lg border border-[#E0E7EB] bg-white px-[12px] py-[8px] capitalize text-grey-800 no-underline hover:bg-blue-25 active:bg-blue-50 mobile:w-[50%]">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on StellarExpert
              </a>
              <button onClick={() => setShowQr(false)} className="flex h-11 w-full flex-1 items-center justify-center rounded-lg border border-[#E0E7EB] px-3 text-sm text-grey-700 hover:bg-grey-50">
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}