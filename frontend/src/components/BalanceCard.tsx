"use client";

import { memo, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, ArrowDownToLine, ArrowRightLeft, Wallet, Copy, Check } from "lucide-react";
import { getBalances } from "@/lib/wallet";
import { getXlmUsdPrice, usdBalanceOf } from "@/lib/prices";

interface BalanceCardProps {
  balance: string;
  showBalance: boolean;
  onToggleBalance: () => void;
  emailName: string;
  balances?: any[];
  publicKey?: string | null;
  compact?: boolean;
  hideHero?: boolean;
  onSwap?: () => void;
  onSend?: () => void;
  onAddFunds?: () => void;
  onWithdraw?: () => void;
  children?: ReactNode;
}

const BalanceCard = memo(function BalanceCard({ balance, showBalance, onToggleBalance, emailName, balances, publicKey, compact, hideHero, onSwap, onSend, onAddFunds, onWithdraw, children }: BalanceCardProps) {
  const [bals, setBals] = useState<any[]>(balances ?? []);
  const [xlmUsd, setXlmUsd] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (balances) { setBals(balances); return; }
    if (!publicKey) return;
    getBalances(publicKey).then(setBals).catch(() => {});
  }, [publicKey, balances]);

  useEffect(() => {
    getXlmUsdPrice().then(setXlmUsd);
  }, []);

  const usd = usdBalanceOf(bals, xlmUsd);

  const copyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full rounded-xl bg-white p-5 shadow-[0px_0px_40px_rgba(0,0,0,0.06)] sm:p-8 sm:px-10">
      {!compact && !hideHero && (
        <div className="mb-6 flex w-full items-center justify-start gap-2 overflow-hidden mobile:gap-4">
          <div className="flex h-10 w-10 select-none items-center justify-center rounded-full border border-[#E0E7EB] bg-primaryBlue text-base font-bold text-white mobile:h-[68px] mobile:w-[68px] mobile:text-[26px]">
            {emailName.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-left text-base font-bold text-grey-800 mobile:text-[26px]">
            Welcome back, {emailName}!
          </h3>
        </div>
      )}

      {!hideHero && (
        <div className="flex w-full items-start justify-between">
          <span className="inline-flex items-center gap-1 text-grey-400">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-semibold mobile:text-sm">Total balance</span>
          </span>
          <button onClick={onToggleBalance} className="p-2 rounded-lg bg-grey-50 text-grey-600 hover:bg-grey-100 active:bg-grey-200 transition-colors" aria-label={showBalance ? "Hide balance" : "Show balance"}>
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      )}

      {!hideHero && (
        <div className="flex w-full items-center justify-between mt-1">
          <div className="flex items-baseline gap-2">
            <span className="balance-display tabular-nums text-grey-900">
              {showBalance ? `$${usd.toFixed(2)}` : '••••••'}
            </span>
            <span className="balance-unit">USD</span>
          </div>
          {publicKey && (
            <button onClick={copyAddress} className="flex cursor-pointer items-start justify-center gap-1 rounded-[18px] bg-grey-50 px-2.5 py-2.5 text-grey-600 hover:bg-grey-100 active:bg-grey-200 mobile:px-3 transition-colors" aria-label="Copy wallet address">
              <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </div>
              <span className="hidden text-xs font-semibold text-grey-600 sm:inline">
                {copied ? "Copied!" : "Your Wallet Address"}
              </span>
            </button>
          )}
        </div>
      )}

      {!compact && !hideHero && (
        <div className="flex items-center gap-2 mt-5">
          {onSend ? (
            <button onClick={onSend} className="icon-btn-rect icon-btn-rect-solid" style={{ border: 'none' }}>
              <ArrowUpRight className="w-5 h-5" />
              <span>Send</span>
            </button>
          ) : (
            <Link href="/send" className="icon-btn-rect icon-btn-rect-solid">
              <ArrowUpRight className="w-5 h-5" />
              <span>Send</span>
            </Link>
          )}
          {onAddFunds ? (
            <button onClick={onAddFunds} className="icon-btn-rect" style={{ border: 'none' }}>
              <ArrowDownLeft className="w-5 h-5" />
              <span>Add Funds</span>
            </button>
          ) : (
            <Link href="/receive" className="icon-btn-rect">
              <ArrowDownLeft className="w-5 h-5" />
              <span>Add Funds</span>
            </Link>
          )}
          {onWithdraw ? (
            <button onClick={onWithdraw} className="icon-btn-rect" style={{ border: 'none' }}>
              <ArrowDownToLine className="w-5 h-5" />
              <span>Withdraw</span>
            </button>
          ) : (
            <Link href="/send" className="icon-btn-rect">
              <ArrowDownToLine className="w-5 h-5" />
              <span>Withdraw</span>
            </Link>
          )}
          {onSwap ? (
            <button onClick={onSwap} className="icon-btn-rect" style={{ border: 'none' }}>
              <ArrowRightLeft className="w-5 h-5" />
              <span>Swap</span>
            </button>
          ) : (
            <Link href="/swap" className="icon-btn-rect">
              <ArrowRightLeft className="w-5 h-5" />
              <span>Swap</span>
            </Link>
          )}
        </div>
      )}

      {!compact && !hideHero && children && (
        <div className="mt-5 border-t border-[#E0E7EB] pt-5">
          {children}
        </div>
      )}
      {hideHero && children && (
        <div>{children}</div>
      )}
    </section>
  );
});

export default BalanceCard;