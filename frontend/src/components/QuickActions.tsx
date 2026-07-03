"use client";

import Link from "next/link";
import { ArrowDownToLine, Send, Link2, PlusCircle, RefreshCw } from "lucide-react";

interface QuickActionsProps {
  onClaimClick: () => void;
}

export default function QuickActions({ onClaimClick }: QuickActionsProps) {
  return (
    <div className="mt-4">
      <h3 className="font-extrabold text-slate-900 mb-1">Quick Actions</h3>
      <p className="text-[12px] font-semibold text-slate-500 mb-4">Do more with Atreus</p>
      <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
        <Link href="/send" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-indigo-100 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Send className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-slate-900">Send Payment</span>
            <span className="text-[10px] font-bold text-slate-400">Send crypto or tokens</span>
          </div>
        </Link>
        <Link href="/receive" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-blue-100 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowDownToLine className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-slate-900">Receive Payment</span>
            <span className="text-[10px] font-bold text-slate-400">Receive crypto or tokens</span>
          </div>
        </Link>
        <Link href="/create" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-purple-100 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Link2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-slate-900">Create Payment Link</span>
            <span className="text-[10px] font-bold text-slate-400">Create rules & share</span>
          </div>
        </Link>
        <button onClick={onClaimClick} className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-purple-100 transition-all group text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-slate-900">Claim Payment Link</span>
            <span className="text-[10px] font-bold text-slate-400">Claim funds from a link</span>
          </div>
        </button>
        <Link href="/swap" className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-2xl p-4 min-w-[220px] hover:shadow-md hover:border-emerald-100 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-slate-900">Swap Tokens</span>
            <span className="text-[10px] font-bold text-slate-400">Instant token swaps</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
