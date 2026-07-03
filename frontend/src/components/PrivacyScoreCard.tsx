"use client";

import { memo } from "react";
import Link from "next/link";
import { Shield, ArrowRight, MoreHorizontal, Check } from "lucide-react";
import Image from "next/image";
import progressImg from "../media/progressbar.png";

const PrivacyScoreCard = memo(function PrivacyScoreCard() {
  return (
    <div className="panel flex flex-col relative overflow-hidden bg-[#0d0d0d] border border-[#1a1a1a]">
      <div className="p-5 flex flex-col relative z-10">
        <div className="flex items-center justify-between w-full mb-5">
          <h3 className="text-[14px] font-bold flex items-center gap-2 text-white">
            Privacy Score <Shield className="w-3.5 h-3.5 text-white opacity-80" />
          </h3>
          <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
        </div>

        <div className="flex items-center gap-5">
          {/* Ring chart using image */}
          <div className="relative w-[90px] h-[90px] shrink-0 bg-black overflow-hidden flex items-center justify-center">
            <Image src={progressImg} alt="Progress" layout="fill" objectFit="cover" />
          </div>

          {/* Score text */}
          <div className="flex flex-col">
            <div className="bg-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded-full inline-flex items-center gap-1 w-max mb-1 border border-[rgba(255,255,255,0.1)]">
              <Check className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">Excellent</span>
            </div>
            <span className="text-[48px] font-extrabold tracking-tighter text-white leading-[1] mb-1">100%</span>
            <span className="text-[10px] text-[#94a3b8]">
              No identity leaks detected.
            </span>
          </div>
        </div>

        <div className="mt-5">
          <Link href="/security" className="flex items-center gap-1.5 text-[12px] font-bold text-white hover:opacity-80 transition-opacity w-max">
            View details <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
});

export default PrivacyScoreCard;
