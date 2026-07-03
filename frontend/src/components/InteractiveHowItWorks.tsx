"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LinkIcon, ArrowRightLeft, Wallet, CheckCircle2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import BorderGlow from "./BorderGlow";
import ShinyText from "./ShinyText";

const steps = [
  {
    id: 1,
    title: "Create a Payment Link",
    description: "Set the amount and generate a secure payment link. Funds are locked in a smart contract on the Stellar network.",
    icon: LinkIcon,
  },
  {
    id: 2,
    title: "Share the Link",
    description: "Send the link to anyone via SMS, email, or chat. No app download or wallet setup required on their end.",
    icon: ArrowRightLeft,
  },
  {
    id: 3,
    title: "Recipient Claims Funds",
    description: "Recipient opens the link, confirms with a passkey, and the funds are transferred instantly to their wallet.",
    icon: Wallet,
  }
];

export function InteractiveHowItWorks() {
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <BorderGlow
        edgeSensitivity={50}
        glowColor="#ffffff"
        backgroundColor="#000000"
        borderRadius={16}
        glowRadius={30}
        glowIntensity={0.5}
        coneSpread={25}
        animated={false}
        colors={['#ffffff', '#aaaaaa', '#555555']}
      >
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
          {/* macOS Window Controls */}
          <div className="h-12 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          
          {/* Content Area */}
          <div className="flex flex-col md:flex-row h-[500px]">
            {/* Sidebar */}
            <div className="w-full md:w-2/5 border-r border-white/10 bg-white/5 p-4 flex flex-col gap-2 overflow-y-auto">
              {steps.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={cn(
                      "text-left p-4 rounded-xl transition-all duration-300 relative group text-sm",
                      isActive ? "bg-white/10 shadow-lg border border-white/5" : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0",
                        isActive ? "bg-white text-black shadow-lg shadow-white/20" : "bg-white/10 text-slate-400 group-hover:text-white"
                      )}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      {isActive ? (
                        <ShinyText text={step.title} speed={2} className="font-bold text-[15px]" />
                      ) : (
                        <h3 className="font-bold text-[15px] text-slate-400 group-hover:text-white">{step.title}</h3>
                      )}
                    </div>
                    <p className={cn("text-[13px] leading-relaxed", isActive ? "text-slate-300" : "text-slate-500 group-hover:text-slate-400")}>
                      {step.description}
                    </p>
                    {isActive && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Main View Area */}
            <div className="w-full md:w-3/5 relative bg-gradient-to-br from-black/20 to-black/60 overflow-hidden flex items-center justify-center p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-sm"
                >
                  {activeStep === 1 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                      <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <LinkIcon className="w-6 h-6 text-white" />
                        </div>
                        <ShinyText text="Create Payment" speed={2} className="font-bold text-xl mb-1" />
                        <p className="text-slate-400 text-sm">Set the amount to send</p>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                          <span className="text-slate-400 text-sm">Amount</span>
                          <span className="text-white font-bold text-xl">100.00 USDC</span>
                        </div>
                        <button className="w-full bg-white hover:bg-slate-200 transition-colors text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                          <LinkIcon className="w-4 h-4" />
                          Generate Link
                        </button>
                      </div>
                    </div>
                  )}
                  {activeStep === 2 && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-white/10 border border-white/20 rounded-2xl rounded-tr-sm p-4 self-end max-w-[80%] backdrop-blur-md shadow-xl">
                        <p className="text-white text-sm leading-relaxed">Hey! I've sent you 100 USDC using Atreus.</p>
                      </div>
                      <div className="bg-white/10 border border-white/20 rounded-2xl rounded-tr-sm p-4 self-end max-w-[80%] backdrop-blur-md shadow-xl">
                        <p className="text-white font-bold text-sm underline truncate">https://atreus.network/claim/xyz...</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 self-start max-w-[80%] backdrop-blur-md shadow-xl mt-4">
                        <p className="text-slate-300 text-sm leading-relaxed">Awesome, thanks! Claiming it now.</p>
                      </div>
                    </div>
                  )}
                  {activeStep === 3 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                      </div>
                      <ShinyText text="Funds Claimed!" speed={2} className="font-bold text-2xl mb-2" />
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed">100.00 USDC has been successfully transferred to your wallet.</p>
                      <div className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 w-full justify-center">
                        <span className="text-slate-300 font-mono text-sm">Tx: 0x4f...9a2</span>
                        <Copy className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </BorderGlow>
    </div>
  );
}
