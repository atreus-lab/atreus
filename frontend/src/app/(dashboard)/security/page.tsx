"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import Image from "next/image";
import Link from "next/link";
import { 
  Shield, ArrowRight, Laptop, Globe, ShieldAlert, 
  Lock, Bell, Key, Fingerprint, Smartphone, CheckCircle2, Eye 
} from "lucide-react";

// @ts-ignore
import shieldImg from "@/media/shield3.png";
// @ts-ignore
import progressImg from "@/media/progressbar.png";

export default function SecurityPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <AppHeader title="Security" subtitle="Protect your assets and manage wallet security" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content flex flex-col gap-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-[1200px] w-full mx-auto pb-10">
            
            {/* ROW 1: Security Score + Auth Options */}
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* Security Score (Large) */}
              <div className="panel p-6 flex flex-col relative overflow-hidden flex-[1.4]">
                {/* Background Image right side */}
                <div className="absolute right-[-15%] top-[-10%] bottom-[-10%] opacity-20 pointer-events-none w-[70%] z-0 flex items-center justify-center">
                  <Image src={shieldImg} alt="Shield background" layout="fill" objectFit="contain" className="object-right" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-1.5 mb-5">
                    <h3 className="text-[14px] font-bold text-white">Security Score</h3>
                    <Shield className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  <div className="flex flex-col">
                    <div className="bg-[rgba(255,255,255,0.08)] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 w-max mb-2 border border-[rgba(255,255,255,0.1)]">
                      <span className="text-[11px] font-bold text-white">Excellent</span>
                    </div>
                    <span className="text-[54px] font-extrabold tracking-tighter text-white leading-[1] mb-2">100%</span>
                    <span className="text-[13px] text-white font-medium mb-4">Your wallet is fully protected</span>
                    
                    <ul className="flex flex-col gap-2">
                      <li className="flex items-center gap-2 text-[12px] text-[#94a3b8]">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" /> No known security issues
                      </li>
                      <li className="flex items-center gap-2 text-[12px] text-[#94a3b8]">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" /> All protection features active
                      </li>
                      <li className="flex items-center gap-2 text-[12px] text-[#94a3b8]">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" /> Your recovery phrase is secure
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-4">
                    <Link href="#" className="flex items-center gap-1.5 text-[12px] font-bold text-white hover:opacity-80 transition-opacity w-max">
                      View security recommendations <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Auth Group */}
              <div className="flex flex-col sm:flex-row gap-4 flex-[2.6]">
                {/* Recovery Phrase */}
                <div className="panel p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-white" />
                      <h3 className="text-[13px] font-bold text-white">Recovery Phrase</h3>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Your recovery phrase is the master key to your wallet.</p>
                    <div className="flex items-center justify-between bg-[#111] rounded-lg p-3 border border-[#1a1a1a] mb-4">
                      <div className="flex gap-[3px]">
                        {[...Array(12)].map((_, i) => <span key={i} className="w-[3px] h-[3px] bg-white rounded-full opacity-60"></span>)}
                      </div>
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-white text-[12px] font-bold transition-colors">
                    Manage Phrase
                  </button>
                </div>

                {/* Passkeys */}
                <div className="panel p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Fingerprint className="w-4 h-4 text-white" />
                      <h3 className="text-[13px] font-bold text-white">Passkeys</h3>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Use passkeys for secure, passwordless authentication.</p>
                    <div className="flex items-center justify-between bg-[rgba(255,255,255,0.03)] rounded-lg p-3 border border-[rgba(255,255,255,0.06)] mb-4 cursor-pointer hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span className="text-[11px] font-semibold text-white">1 Passkey Active</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-white text-[12px] font-bold transition-colors">
                    Manage Passkeys
                  </button>
                </div>

                {/* Google Auth */}
                <div className="panel p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-4 h-4 text-white" />
                      <h3 className="text-[13px] font-bold text-white">Google Authentication</h3>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Add an extra layer of security to your account.</p>
                    <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.03)] rounded-lg p-3 border border-[rgba(255,255,255,0.06)] mb-4">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span className="text-[11px] font-semibold text-white">Enabled</span>
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-white text-[12px] font-bold transition-colors">
                    Manage 2FA
                  </button>
                </div>
              </div>
            </div>

            {/* ROW 2: Devices & Alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Trusted Devices */}
              <div className="panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Laptop className="w-4 h-4 text-white" />
                    <h3 className="text-[13px] font-bold text-white">Trusted Devices</h3>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Manage devices that have access to your wallet.</p>
                  <div className="flex items-center justify-between bg-[#111] rounded-lg p-3 border border-[#1a1a1a] mb-4">
                    <div className="flex items-center gap-3">
                      <Laptop className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-white">MacBook Pro</span>
                        <span className="text-[9px] text-gray-500">macOS 14.5 • Chrome • Now</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-medium text-gray-400 bg-[#1a1a1a] px-2 py-0.5 rounded">Current</span>
                  </div>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.05)] text-white text-[12px] font-bold transition-colors">
                  Manage Devices (3)
                </button>
              </div>

              {/* Active Sessions */}
              <div className="panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-white" />
                    <h3 className="text-[13px] font-bold text-white">Active Sessions</h3>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Monitor and sign out of active sessions.</p>
                  <div className="flex items-center justify-between bg-[#111] rounded-lg p-3 border border-[#1a1a1a] mb-4">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-white">Mumbai, India</span>
                        <span className="text-[9px] text-gray-500">192.168.1.1 • Now</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-medium text-gray-400 bg-[#1a1a1a] px-2 py-0.5 rounded">Current</span>
                  </div>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.05)] text-white text-[12px] font-bold transition-colors">
                  View All Sessions (2)
                </button>
              </div>

              {/* Security Alerts */}
              <div className="panel p-5 flex flex-col">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-white" />
                    <h3 className="text-[13px] font-bold text-white">Security Alerts</h3>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Important security notifications and alerts.</p>
                  <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.02)] rounded-lg p-4 border border-[rgba(255,255,255,0.04)] h-full">
                    <ShieldAlert className="w-5 h-5 text-gray-500" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-white">No security alerts</span>
                      <span className="text-[10px] text-gray-500 leading-snug mt-0.5">You're all set! We'll notify you if anything changes.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Approval */}
              <div className="panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <h3 className="text-[13px] font-bold text-white">Transaction Approval</h3>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Configure how transaction approvals are handled.</p>
                  <div className="flex items-center justify-between bg-[#111] rounded-lg p-3 border border-[#1a1a1a] mb-4 cursor-pointer hover:bg-[#1a1a1a] transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-white">Manual Review</span>
                        <span className="text-[9px] text-gray-500">Require review for all transactions</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.05)] text-white text-[12px] font-bold transition-colors">
                  Configure Settings
                </button>
              </div>

            </div>

            {/* ROW 3: Privacy, Lock & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Privacy Controls */}
              <div className="panel p-5 flex flex-col justify-between lg:col-span-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-white" />
                    <h3 className="text-[13px] font-bold text-white">Privacy Controls</h3>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Manage your privacy and data visibility.</p>
                </div>
                <div className="flex items-center justify-between bg-[#111] rounded-lg p-3 border border-[#1a1a1a] cursor-pointer hover:bg-[#1a1a1a] transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-white">Enhanced Privacy</span>
                      <span className="text-[9px] text-gray-500">Hide balance on lock</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-300">On</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Emergency Lock */}
              <div className="panel p-5 flex flex-col justify-between lg:col-span-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-white" />
                    <h3 className="text-[13px] font-bold text-white">Emergency Lock</h3>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">Temporarily lock your wallet in case of suspicious activity.</p>
                </div>
                <button className="w-full py-[14px] rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.15)] text-white text-[12px] font-bold transition-colors flex items-center justify-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> Lock Wallet Now
                </button>
              </div>

              {/* Security Activity */}
              <div className="panel p-5 flex flex-col justify-between lg:col-span-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-bold text-white">Security Activity</h3>
                  <Link href="#" className="text-[11px] text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                
                <div className="flex flex-col gap-0 relative">
                  <div className="absolute left-[9px] top-4 bottom-4 w-px bg-[#2a2a2a] z-0"></div>
                  
                  <div className="flex items-start gap-4 py-1.5 relative z-10">
                    <div className="w-[19px] h-[19px] rounded-full bg-white flex items-center justify-center shrink-0 outline outline-[4px] outline-[#0a0a0a]">
                      <CheckCircle2 className="w-3 h-3 text-black" />
                    </div>
                    <div className="flex flex-col flex-1 pb-1">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold text-white">Login Successful</span>
                        <span className="text-[9px] text-gray-500">Now</span>
                      </div>
                      <span className="text-[10px] text-gray-500">Mumbai, India • 192.168.1.1</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 py-1.5 relative z-10">
                    <div className="w-[19px] h-[19px] rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#333] outline outline-[4px] outline-[#0a0a0a]">
                      <Smartphone className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex flex-col flex-1 pb-1">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold text-white">2FA Enabled</span>
                        <span className="text-[9px] text-gray-500">2d ago</span>
                      </div>
                      <span className="text-[10px] text-gray-500">Google Authentication enabled</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 py-1.5 relative z-10">
                    <div className="w-[19px] h-[19px] rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#333] outline outline-[4px] outline-[#0a0a0a]">
                      <Key className="w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex flex-col flex-1 pb-1">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold text-white">Passkey Added</span>
                        <span className="text-[9px] text-gray-500">5d ago</span>
                      </div>
                      <span className="text-[10px] text-gray-500">New passkey registered</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <Link href="#" className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-white transition-colors w-max">
                    View full security history <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
    </>
  );
}
