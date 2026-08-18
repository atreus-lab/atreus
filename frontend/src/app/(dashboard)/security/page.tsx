"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, type StoredWallet } from "@/lib/wallet";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import PageHeader from "@/components/ui/PageHeader";
import Image from "next/image";
import { 
  Shield, ArrowRight, Laptop, Globe, ShieldAlert, 
  Lock, Bell, Key, Fingerprint, Smartphone, CheckCircle2, Eye, 
  Loader2
} from "lucide-react";

import shieldImg from "@/media/shield3.png";

export default function SecurityPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [privacyEnabled, setPrivacyEnabled] = useState(true);
  const [walletLocked, setWalletLocked] = useState(false);

  const PRIVACY_KEY = 'atreus_privacy_enabled';
  const LOCK_KEY = 'atreus_wallet_locked';

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    setPrivacyEnabled(localStorage.getItem(PRIVACY_KEY) !== 'false');
    setWalletLocked(localStorage.getItem(LOCK_KEY) === 'true');
    setPasskeyRegistered(localStorage.getItem('atreus_passkey_registered') === 'true');
    setLoading(false);
  }, [router]);

  const handleRegisterPasskey = async () => {
    if (!storedWallet) return;
    setPasskeyLoading(true);
    try {
      const { registerPasskey } = await import('@/lib/passkey');
      await registerPasskey(storedWallet.email || storedWallet.publicKey);
      localStorage.setItem('atreus_passkey_registered', 'true');
      setPasskeyRegistered(true);
    } catch (err: any) {
      console.error('Passkey registration failed:', err);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const togglePrivacy = () => {
    const next = !privacyEnabled;
    setPrivacyEnabled(next);
    localStorage.setItem(PRIVACY_KEY, String(next));
  };

  const handleLockWallet = () => {
    const next = !walletLocked;
    setWalletLocked(next);
    localStorage.setItem(LOCK_KEY, String(next));
    if (next) {
      localStorage.setItem('atreus_lock_time', Date.now().toString());
    } else {
      localStorage.removeItem('atreus_lock_time');
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <AppHeader />
      <div className="app-content flex flex-col gap-6">
        <PageHeader title="Security" subtitle="Protect your assets and manage wallet security" backHref="/dashboard" />
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-[803px] w-full mx-auto pb-10">
            
            {/* ROW 1: Security Score + Auth Options */}
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* Security Score (Large, dark accent card) */}
              <div className="p-6 flex flex-col relative overflow-hidden flex-[1.4] rounded-xl bg-[#0d1017] border border-[#1c2230]">
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
                    <div className="bg-white/10 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 w-max mb-2 border border-white/15">
                      <span className="text-[11px] font-bold text-white">Excellent</span>
                    </div>
                    <span className="text-[54px] font-extrabold tracking-tighter text-white leading-[1] mb-2">100%</span>
                    <span className="text-[13px] text-white font-medium mb-4">Your wallet is fully protected</span>
                    
                    <ul className="flex flex-col gap-2">
                      <li className="flex items-center gap-2 text-[12px] text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" /> No known security issues
                      </li>
                      <li className="flex items-center gap-2 text-[12px] text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" /> All protection features active
                      </li>
                      <li className="flex items-center gap-2 text-[12px] text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" /> Your recovery phrase is secure
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-4">
                    <button onClick={() => router.push('/settings')} className="flex items-center gap-1.5 text-[12px] font-bold text-white hover:opacity-80 transition-opacity w-max">
                      View security recommendations <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Auth Group */}
              <div className="flex flex-col sm:flex-row gap-4 flex-[2.6]">
                {/* Recovery Phrase */}
                <div className="panel p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-secondary" />
                      <h3 className="text-[13px] font-bold text-primary">Recovery Phrase</h3>
                    </div>
                    <p className="text-[11px] text-secondary mb-4 leading-relaxed">Your recovery phrase is the master key to your wallet.</p>
                    <div className="flex items-center justify-between bg-elevated rounded-lg p-3 border border-[var(--border-default)] mb-4">
                      <div className="flex gap-[3px]">
                        {[...Array(12)].map((_, i) => <span key={i} className="w-[3px] h-[3px] bg-primary rounded-full opacity-40"></span>)}
                      </div>
                      <Eye className="w-3.5 h-3.5 text-secondary" />
                    </div>
                  </div>
                  <button onClick={() => router.push('/wallet')} className="btn-outline w-full">
                    Manage Phrase
                  </button>
                </div>

                {/* Passkeys */}
                <div className="panel p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Fingerprint className="w-4 h-4 text-secondary" />
                      <h3 className="text-[13px] font-bold text-primary">Passkeys</h3>
                    </div>
                    <p className="text-[11px] text-secondary mb-4 leading-relaxed">Use passkeys for secure, passwordless authentication.</p>
                    <div onClick={() => router.push('/profile')} className="flex items-center justify-between bg-elevated rounded-lg p-3 border border-[var(--border-default)] mb-4 cursor-pointer hover:bg-[rgba(0,0,0,0.03)] transition-colors">
                      <div className="flex items-center gap-2">
                        {passkeyRegistered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Fingerprint className="w-3.5 h-3.5 text-secondary" />
                        )}
                        <span className="text-[11px] font-semibold text-primary">{passkeyRegistered ? '1 Passkey Active' : 'No passkeys registered'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                    </div>
                  </div>
                  <button onClick={handleRegisterPasskey} disabled={passkeyLoading} className="btn-outline w-full disabled:opacity-50 flex items-center justify-center gap-2">
                    {passkeyLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering...</> : 'Manage Passkeys'}
                  </button>
                </div>

                {/* Google Auth */}
                <div className="panel p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-4 h-4 text-secondary" />
                      <h3 className="text-[13px] font-bold text-primary">Google Authentication</h3>
                    </div>
                    <p className="text-[11px] text-secondary mb-4 leading-relaxed">Add an extra layer of security to your account.</p>
                    <div className="flex items-center gap-2 bg-elevated rounded-lg p-3 border border-[var(--border-default)] mb-4">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span className="text-[11px] font-semibold text-primary">Enabled</span>
                    </div>
                  </div>
                  <button onClick={() => router.push('/profile')} className="btn-outline w-full">
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
                    <Laptop className="w-4 h-4 text-secondary" />
                    <h3 className="text-[13px] font-bold text-primary">Trusted Devices</h3>
                  </div>
                  <p className="text-[11px] text-secondary mb-4 leading-relaxed">Manage devices that have access to your wallet.</p>
                  <div className="flex items-center justify-between bg-elevated rounded-lg p-3 border border-[var(--border-default)] mb-4">
                    <div className="flex items-center gap-3">
                      <Laptop className="w-4 h-4 text-secondary" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-primary">MacBook Pro</span>
                        <span className="text-[9px] text-secondary">macOS 14.5 • Chrome • Now</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-medium text-accent bg-blue-50 px-2 py-0.5 rounded">Current</span>
                  </div>
                </div>
                <button onClick={() => router.push('/profile')} className="btn-outline w-full">
                  Manage Devices
                </button>
              </div>

              {/* Active Sessions */}
              <div className="panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-secondary" />
                    <h3 className="text-[13px] font-bold text-primary">Active Sessions</h3>
                  </div>
                  <p className="text-[11px] text-secondary mb-4 leading-relaxed">Monitor and sign out of active sessions.</p>
                  <div className="flex items-center justify-between bg-elevated rounded-lg p-3 border border-[var(--border-default)] mb-4">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-secondary" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-primary">Mumbai, India</span>
                        <span className="text-[9px] text-secondary">192.168.1.1 • Now</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-medium text-accent bg-blue-50 px-2 py-0.5 rounded">Current</span>
                  </div>
                </div>
                <button onClick={() => router.push('/activity')} className="btn-outline w-full">
                  View All Sessions
                </button>
              </div>

              {/* Security Alerts */}
              <div className="panel p-5 flex flex-col">
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-secondary" />
                    <h3 className="text-[13px] font-bold text-primary">Security Alerts</h3>
                  </div>
                  <p className="text-[11px] text-secondary mb-4 leading-relaxed">Important security notifications and alerts.</p>
                  <div className="flex items-center gap-3 bg-elevated rounded-lg p-4 border border-[var(--border-default)] h-full">
                    <ShieldAlert className="w-5 h-5 text-secondary" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-primary">No security alerts</span>
                      <span className="text-[10px] text-secondary leading-snug mt-0.5">You're all set! We'll notify you if anything changes.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Approval */}
              <div className="panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                    <h3 className="text-[13px] font-bold text-primary">Transaction Approval</h3>
                  </div>
                  <p className="text-[11px] text-secondary mb-4 leading-relaxed">Configure how transaction approvals are handled.</p>
                  <div className="flex items-center justify-between bg-elevated rounded-lg p-3 border border-[var(--border-default)] mb-4 cursor-pointer hover:bg-[rgba(0,0,0,0.03)] transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-secondary" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-primary">Manual Review</span>
                        <span className="text-[9px] text-secondary">Require review for all transactions</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                  </div>
                </div>
                <button onClick={() => router.push('/settings')} className="btn-outline w-full">
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
                    <Eye className="w-4 h-4 text-secondary" />
                    <h3 className="text-[13px] font-bold text-primary">Privacy Controls</h3>
                  </div>
                  <p className="text-[11px] text-secondary mb-4 leading-relaxed">Manage your privacy and data visibility.</p>
                </div>
                <div onClick={togglePrivacy} className="flex items-center justify-between bg-elevated rounded-lg p-3 border border-[var(--border-default)] cursor-pointer hover:bg-[rgba(0,0,0,0.03)] transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-secondary" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-primary">Enhanced Privacy</span>
                      <span className="text-[9px] text-secondary">Hide balance on lock</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-primary">{privacyEnabled ? 'On' : 'Off'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                  </div>
                </div>
              </div>

              {/* Emergency Lock */}
              <div className="panel p-5 flex flex-col justify-between lg:col-span-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-secondary" />
                    <h3 className="text-[13px] font-bold text-primary">Emergency Lock</h3>
                  </div>
                  <p className="text-[11px] text-secondary mb-4 leading-relaxed">Temporarily lock your wallet in case of suspicious activity.</p>
                </div>
                <button onClick={handleLockWallet} className="btn-outline w-full flex items-center justify-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> {walletLocked ? 'Unlock Wallet' : 'Lock Wallet Now'}
                </button>
              </div>

              {/* Security Activity */}
              <div className="panel p-5 flex flex-col justify-between lg:col-span-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-bold text-primary">Security Activity</h3>
                  <button onClick={() => router.push('/activity')} className="text-[11px] text-secondary hover:text-primary transition-colors flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex flex-col gap-0 relative">
                  <div className="absolute left-[9px] top-4 bottom-4 w-px bg-[var(--border-default)] z-0"></div>
                  
                  <div className="flex items-start gap-4 py-1.5 relative z-10">
                    <div className="w-[19px] h-[19px] rounded-full bg-white border border-[var(--border-default)] flex items-center justify-center shrink-0 outline outline-[4px] outline-[var(--background-primary)]">
                      <CheckCircle2 className="w-3 h-3 text-success" />
                    </div>
                    <div className="flex flex-col flex-1 pb-1">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold text-primary">Login Successful</span>
                        <span className="text-[9px] text-secondary">Now</span>
                      </div>
                      <span className="text-[10px] text-secondary">Mumbai, India • 192.168.1.1</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 py-1.5 relative z-10">
                    <div className="w-[19px] h-[19px] rounded-full bg-elevated flex items-center justify-center shrink-0 border border-[var(--border-default)] outline outline-[4px] outline-[var(--background-primary)]">
                      <Smartphone className="w-3 h-3 text-secondary" />
                    </div>
                    <div className="flex flex-col flex-1 pb-1">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold text-primary">2FA Enabled</span>
                        <span className="text-[9px] text-secondary">2d ago</span>
                      </div>
                      <span className="text-[10px] text-secondary">Google Authentication enabled</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 py-1.5 relative z-10">
                    <div className="w-[19px] h-[19px] rounded-full bg-elevated flex items-center justify-center shrink-0 border border-[var(--border-default)] outline outline-[4px] outline-[var(--background-primary)]">
                      <Key className="w-3 h-3 text-secondary" />
                    </div>
                    <div className="flex flex-col flex-1 pb-1">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold text-primary">Passkey Added</span>
                        <span className="text-[9px] text-secondary">5d ago</span>
                      </div>
                      <span className="text-[10px] text-secondary">New passkey registered</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-3 border-t border-[var(--border-default)]">
                  <button onClick={() => router.push('/activity')} className="flex items-center gap-1.5 text-[11px] font-bold text-secondary hover:text-primary transition-colors w-max">
                    View full security history <ArrowRight className="w-3 h-3" />
                  </button>
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