"use client";

import Image from "next/image";
import Link from "next/link";
import { Shield, ChevronDown, ArrowRight } from "lucide-react";
import shieldImg from "../media/Shield1.png";

export default function PrivacyScoreCard() {
  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-8 z-10">
        <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
          Privacy Score <Shield className="w-4 h-4 text-slate-400" />
        </h3>
        <ChevronDown className="w-4 h-4 text-slate-400 cursor-pointer" />
      </div>

      <div className="flex items-center gap-6 z-10">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="12" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#4F46E5" strokeWidth="12" strokeDasharray="251" strokeDashoffset="0" strokeLinecap="round" className="animate-[dash_1.5s_ease-out_forwards]" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
            <Shield className="w-8 h-8 fill-indigo-100" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-green-500 font-bold text-sm mb-1">Excellent</span>
          <span className="text-4xl font-black text-slate-900 tracking-tight">100%</span>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 leading-snug">
            You&apos;re doing great!<br />No identity leaks detected.
          </span>
        </div>
      </div>

      <Link href="/security" className="mt-auto self-start text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 z-10">
        View details <ArrowRight className="w-4 h-4" />
      </Link>

      <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-48 h-48 opacity-20 pointer-events-none mix-blend-multiply">
        <Image src={shieldImg} alt="Shield" fill className="object-contain drop-shadow-xl" />
      </div>
    </div>
  );
}
