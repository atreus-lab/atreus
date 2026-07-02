import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Rocket, Link as LinkIcon, DollarSign, CheckCircle2, Shield, Layers, Zap, Lock, Wallet, Percent, Bell, ArrowDown, ArrowUp, ArrowRightLeft, RefreshCw, Home as HomeIcon, History, Settings } from "lucide-react";
import logo from "../media/ateruslogo.jpeg";
import mobileImg from "../media/ateruslandpto.png";
import boltImg from "../media/bolt.png";
import lockImg from "../media/lock.png";
import stellarImg from "../media/stellarlogo.webp";

function WalletMockup() {
  return (
    <div className="relative w-full max-w-[320px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 flex flex-col gap-6 overflow-hidden mx-auto z-10 animate-float">
      
      {/* Automated Demo Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes demoCursor {
          0%, 10% { top: 65%; left: 85%; opacity: 0; transform: scale(1); }
          15% { opacity: 1; top: 65%; left: 85%; transform: scale(1); }
          30% { top: 29%; left: 60%; transform: scale(1); } /* Hover over Transfer */
          35% { top: 29%; left: 60%; transform: scale(0.85); } /* Click down */
          40% { top: 29%; left: 60%; transform: scale(1); } /* Click up */
          55% { top: 45%; left: 40%; transform: scale(1); } /* Move away */
          65%, 100% { top: 45%; left: 40%; opacity: 0; transform: scale(1); }
        }
        @keyframes demoButtonClick {
          0%, 34% { transform: scale(1); background-color: #f8fafc; }
          35%, 39% { transform: scale(0.92); background-color: #e2e8f0; } /* Pressed state */
          40%, 100% { transform: scale(1); background-color: #f8fafc; }
        }
        @keyframes demoToast {
          0%, 40% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
          45%, 75% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          80%, 100% { opacity: 0; transform: translate(-50%, -15px) scale(0.95); }
        }
      `}} />

      {/* Simulated Cursor */}
      <svg 
        className="absolute w-6 h-6 z-50 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" 
        style={{ animation: 'demoCursor 8s ease-in-out infinite', opacity: 0, fill: '#0f172a', stroke: 'white', strokeWidth: '1.5' }} 
        viewBox="0 0 24 24"
      >
        <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" strokeLinejoin="round" />
      </svg>

      {/* Success Toast Notification */}
      <div 
        className="absolute top-16 left-1/2 bg-slate-900 text-white text-[10px] font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 z-40 border border-slate-700/50" 
        style={{ animation: 'demoToast 8s cubic-bezier(0.16, 1, 0.3, 1) infinite', opacity: 0, transform: 'translateX(-50%)' }}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        Transfer Initiated
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src={logo} alt="Atreus" width={20} height={20} className="rounded-full" />
          <span className="font-bold text-lg text-slate-900">Atreus</span>
        </div>
        <Bell className="w-5 h-5 text-slate-400" />
      </div>

      {/* Balance */}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-500 font-medium">Total balance</span>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-slate-900">₹10.12</span>
        </div>
        <span className="text-xs text-green-500 font-medium">↑ ₹0.66 (7.07%) All</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <ArrowDown className="w-5 h-5 text-slate-700" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Deposit</span>
        </div>
        <div className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <ArrowUp className="w-5 h-5 text-slate-700" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Withdraw</span>
        </div>
        <div className="flex flex-col items-center gap-2 cursor-pointer relative">
          <div 
            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors shadow-sm"
            style={{ animation: 'demoButtonClick 8s ease-in-out infinite' }}
          >
            <ArrowRightLeft className="w-5 h-5 text-slate-700" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Transfer</span>
        </div>
        <div className="flex flex-col items-center gap-2 cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-slate-100 transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-700" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Convert</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-0 pt-2">
        <span className="text-xs font-semibold text-blue-600 border-b-2 border-blue-600 pb-3 -mb-[2px] px-2 cursor-pointer">Overview</span>
        <span className="text-xs font-medium text-slate-400 pb-3 px-2 cursor-pointer hover:text-slate-600 transition-colors">Transactions</span>
        <span className="text-xs font-medium text-slate-400 pb-3 px-2 cursor-pointer hover:text-slate-600 transition-colors">Assets</span>
      </div>

      {/* Asset List */}
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Cash</span>
          <span className="text-xs font-semibold text-slate-900">₹10.12</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm">$</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">USDC</span>
              <span className="text-[10px] font-semibold text-green-500 mt-0.5">3.35% APY</span>
            </div>
          </div>
          <span className="text-sm font-bold text-slate-900">₹10.11</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white shadow-sm flex items-center justify-center font-bold text-sm">₹</div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">INR</span>
            </div>
          </div>
          <span className="text-sm font-bold text-slate-900">₹0.00</span>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="mt-2 border-t border-slate-100 pt-5 flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-1.5 text-blue-600 cursor-pointer">
          <HomeIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
          <History className="w-5 h-5" />
          <span className="text-[10px] font-medium">History</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
          <Shield className="w-5 h-5" />
          <span className="text-[10px] font-medium">Security</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="fixed inset-0 w-full h-full bg-[#FAFBFF] text-slate-900 overflow-y-auto font-sans flex flex-col z-[100]">
      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20 relative">
        {/* Left Links */}
        <div className="hidden lg:flex items-center gap-8 flex-1">
          <Link href="/" className="text-[13px] font-semibold text-slate-900 tracking-wide hover:text-blue-600 transition-colors">Home</Link>
          <Link href="#features" className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">Features</Link>
          <Link href="#how-it-works" className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">How It Works</Link>
          <Link href="#security" className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">Security</Link>
        </div>
        
        {/* Center Logo */}
        <div className="flex items-center justify-center gap-2.5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Image src={logo} alt="Atreus Logo" width={28} height={28} className="rounded-lg shadow-sm" />
          <span className="text-[19px] font-extrabold text-slate-900 tracking-tight">Atreus</span>
        </div>

        {/* Right Links & Action */}
        <div className="flex items-center justify-end gap-8 flex-1">
          <div className="hidden lg:flex items-center gap-8">
            <Link href="#about" className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">About</Link>
            <Link href="#docs" className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors tracking-wide">Docs</Link>
          </div>
          
          <Link href="/wallet" className="inline-flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 hover:bg-slate-800/90 text-white px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)]">
            Launch Wallet
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
          </Link>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-12 pb-24 flex flex-col relative">
        <div className="flex flex-col lg:flex-row items-center justify-between w-full h-full gap-16 lg:gap-8">
          
          {/* Hero Left Content */}
          <div className="w-full lg:w-1/2 flex flex-col items-start gap-6 z-10 pt-8 lg:pt-0">
            <div className="inline-flex items-center gap-2.5 bg-green-50/80 border border-green-100 text-green-600 px-4 py-2 rounded-full text-xs font-bold tracking-widest backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 relative">
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
              </div>
              BUILT ON STELLAR
            </div>

            <h1 className="text-5xl lg:text-[4.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.1] mt-2">
              Send. Receive.<br/>Build. <span className="text-blue-600">Beyond.</span>
            </h1>

            <p className="text-lg lg:text-xl text-slate-500 max-w-lg leading-relaxed font-medium mt-2">
              Atreus is the easiest way to send and receive funds on Stellar. Secure, private, and no wallet required for the recipient.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-6">
              <Link href="/wallet" className="inline-flex items-center justify-center gap-2.5 bg-blue-600/80 backdrop-blur-md border border-blue-400/50 hover:bg-blue-600 text-white px-8 py-3.5 rounded-full text-[14px] font-semibold transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_24px_-8px_rgba(37,99,235,0.5)] hover:-translate-y-0.5">
                <Rocket className="w-4 h-4 text-blue-200" />
                Launch Wallet
              </Link>
              <Link href="/create" className="inline-flex items-center justify-center gap-2.5 bg-white/40 backdrop-blur-xl border border-white/80 hover:bg-white/60 hover:border-white text-slate-700 px-8 py-3.5 rounded-full text-[14px] font-semibold transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5">
                <LinkIcon className="w-4 h-4 text-slate-500" />
                Create Link
              </Link>
              <Link href="/claim" className="inline-flex items-center justify-center gap-2.5 bg-white/40 backdrop-blur-xl border border-white/80 hover:bg-white/60 hover:border-white text-slate-700 px-8 py-3.5 rounded-full text-[14px] font-semibold transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5">
                <DollarSign className="w-4 h-4 text-slate-500" />
                Claim Funds
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-8 text-sm font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Non-custodial
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-400" />
                Secure
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-400" />
                Built on Stellar & Soroban
              </div>
            </div>
          </div>

          {/* Right Column / Visuals */}
          <div className="relative w-full lg:w-1/2 flex items-center justify-center lg:justify-end mt-16 lg:mt-0 min-h-[550px]">
            
            {/* Abstract Background Shapes */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-[80px] -z-10"></div>
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-200/30 rounded-full blur-[60px] -z-10"></div>

            {/* Main Mockup */}
            <WalletMockup />

            {/* Floating Badge 1 (Top Left) */}
            <div className="hidden sm:flex absolute top-12 left-0 lg:-left-6 bg-white/90 backdrop-blur-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.07),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[1.5rem] p-5 flex-col items-center justify-center gap-3 border border-white/60 z-20 w-[120px] hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 flex items-center justify-center">
                <Image src={boltImg} alt="Instant" width={48} height={48} className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">Instant</span>
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">Transfer</span>
              </div>
            </div>

            {/* Floating Badge 2 (Top Right) */}
            <div className="hidden sm:flex absolute top-32 -right-4 lg:-right-10 bg-white/90 backdrop-blur-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.07),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[1.5rem] p-5 flex-col items-center justify-center gap-3 border border-white/60 z-20 w-[120px] hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 flex items-center justify-center">
                <Image src={lockImg} alt="Secure" width={48} height={48} className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">Secure &</span>
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">Private</span>
              </div>
            </div>

            {/* Floating Badge 3 (Bottom Left) */}
            <div className="hidden sm:flex absolute bottom-28 left-4 lg:-left-10 bg-white/90 backdrop-blur-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.07),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[1.5rem] p-5 flex-col items-center justify-center gap-3 border border-white/60 z-20 w-[120px] hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 flex items-center justify-center">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">No Wallet</span>
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">Required</span>
              </div>
            </div>

            {/* Floating Badge 4 (Bottom Right) */}
            <div className="hidden sm:flex absolute bottom-12 right-0 lg:-right-6 bg-white/90 backdrop-blur-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.07),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[1.5rem] p-5 flex-col items-center justify-center gap-3 border border-white/60 z-20 w-[120px] hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 flex items-center justify-center">
                <Image src={stellarImg} alt="Stellar" width={48} height={48} className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">Built on</span>
                <span className="text-[14px] font-bold text-slate-800 leading-tight tracking-tight">Stellar</span>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Features Row */}
        <div className="w-full mt-24 mb-8">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/30 border border-slate-100 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4 divide-y md:divide-y-0 lg:divide-x divide-slate-100/80">
            
            <div className="flex flex-col gap-3 px-4 pt-4 md:pt-0 lg:border-l-0">
              <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100/50 flex items-center justify-center mb-1">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-extrabold text-[15px] text-slate-900">No Wallet Required</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Recipients don't need a wallet to receive funds.</p>
            </div>

            <div className="flex flex-col gap-3 px-4 pt-6 md:pt-0 border-t border-slate-100 md:border-t-0">
              <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100/50 flex items-center justify-center mb-1">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-extrabold text-[15px] text-slate-900">Non-Custodial</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">You have full control over your funds.</p>
            </div>

            <div className="flex flex-col gap-3 px-4 pt-6 lg:pt-0 border-t border-slate-100 lg:border-t-0">
              <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100/50 flex items-center justify-center mb-1">
                <LinkIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-extrabold text-[15px] text-slate-900">On-Chain & Verifiable</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Transparent transactions on Stellar blockchain.</p>
            </div>

            <div className="flex flex-col gap-3 px-4 pt-6 lg:pt-0 border-t border-slate-100 lg:border-t-0">
              <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100/50 flex items-center justify-center mb-1">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-extrabold text-[15px] text-slate-900">Lightning Fast</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Send and receive in seconds.</p>
            </div>

            <div className="flex flex-col gap-3 px-4 pt-6 lg:pt-0 border-t border-slate-100 lg:border-t-0">
              <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100/50 flex items-center justify-center mb-1">
                <Percent className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-extrabold text-[15px] text-slate-900">Low Fees</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Keep more of what you send.</p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
