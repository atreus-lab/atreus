"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { generateWallet, fundWallet, loadWallet, clearWallet, restoreFromMnemonic, validateMnemonic, getBalance, getExplorerUrl, type StoredWallet } from "@/lib/wallet";
import { Loader2, ExternalLink, Trash2, Eye, EyeOff, LogIn, Copy, Check, ArrowRight, Lock, Shield, CheckCircle2, Key, Database, Layers, ArrowLeft, ShieldCheck, Download, ChevronRight } from "lucide-react";
import Image from "next/image";
import logo from "../../media/ateruslogo.jpeg";
import Link from "next/link";

type WalletView = "login" | "restore" | "secure" | "ready";

const GoogleSVG = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<WalletView>("login");
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  useEffect(() => {
    const existing = loadWallet();
    if (existing) {
      // Already has a wallet — go straight to dashboard
      router.push("/dashboard");
      return;
    }
    setLoading(false);
  }, [router]);

  const finishWallet = async (w: StoredWallet) => {
    setWallet(w);
    setView("secure"); // Go to secure/welcome page first
    const funded = await fundWallet(w.publicKey);
    if (!funded) setError("Wallet funded. You may need to fund it manually.");
    const bal = await getBalance(w.publicKey);
    setBalance(bal);
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setCreating(true);
        setError("");
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const user = await res.json();
        const w = await generateWallet(user.email);
        await finishWallet(w);
      } catch (err: any) {
        setError(err.message || "Google sign-in failed");
      } finally {
        setCreating(false);
      }
    },
    onError: () => setError("Google sign-in failed"),
  });

  const handleRestore = async () => {
    try {
      setError("");
      if (!validateMnemonic(mnemonicInput.trim())) {
        setError("Invalid seed phrase. Check spelling and try again.");
        return;
      }
      const restored = await restoreFromMnemonic(mnemonicInput.trim());
      await finishWallet(restored);
    } catch (err: any) {
      setError(err.message || "Failed to restore wallet");
    }
  };

  const handleDelete = () => {
    clearWallet();
    setWallet(null);
    setView("login");
    setBalance("0");
    setShowMnemonic(false);
  };

  const copyMnemonic = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.mnemonic);
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
  };

  const copyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.publicKey);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFF]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ─── SECURE / WELCOME VIEW ───────────────────────────────────────────────
  if (view === "secure" && wallet) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] font-sans flex flex-col items-center px-4 py-10 relative overflow-hidden">

        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-blue-50/80 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-indigo-50/50 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Nav */}
        <div className="w-full max-w-3xl flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src={logo} alt="Atreus" width={30} height={30} className="rounded-lg shadow-sm" />
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">Atreus</span>
          </Link>
          <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold">Secure. Private. Non-custodial.</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-3xl">

          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-5">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(34,197,94,0.4)] mx-auto">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 text-2xl">🎉</div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
              Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Atreus</span>
            </h1>
            <p className="text-slate-500 font-semibold text-lg max-w-md mx-auto leading-relaxed">
              Your wallet has been created successfully.{wallet.email && <> Linked to <span className="text-slate-700 font-bold">{wallet.email}</span>.</>}
            </p>
          </div>

          {/* Wallet Address Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Your Stellar Address</span>
              <span className="font-mono text-slate-800 text-sm font-semibold break-all">{wallet.publicKey}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyAddress}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {addressCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              </button>
              <a
                href={getExplorerUrl("account", wallet.publicKey)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-blue-500" />
              </a>
            </div>
          </div>

          {/* Balance Pill */}
          {parseFloat(balance) > 0 && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl px-6 py-4 mb-4 flex items-center justify-between shadow-[0_8px_20px_rgba(37,99,235,0.25)]">
              <span className="text-blue-100 font-bold text-sm">Starting Balance</span>
              <span className="text-white font-extrabold text-2xl">{parseFloat(balance).toFixed(2)} <span className="text-base opacity-80">XLM</span></span>
            </div>
          )}

          {/* Recovery Phrase Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Recovery Phrase</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Save these 24 words — they are the only way to restore your wallet.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-xl font-bold text-xs transition-colors"
                >
                  {showMnemonic ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Reveal</>}
                </button>
                <button
                  onClick={copyMnemonic}
                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-xl font-bold text-xs transition-colors"
                >
                  {mnemonicCopied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {wallet.mnemonic.split(" ").map((word, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors">
                  <span className="text-[9px] font-extrabold text-slate-400 tabular-nums">{i + 1}</span>
                  <span className="text-[12px] font-bold text-slate-800 tracking-wide">{showMnemonic ? word : "•••••"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-base">⚠️</span>
            </div>
            <div>
              <p className="font-extrabold text-amber-900 text-sm">Never share your recovery phrase</p>
              <p className="text-amber-700 font-semibold text-xs mt-0.5 leading-relaxed">Anyone with your recovery phrase can access your wallet. Store it somewhere safe offline. Atreus will never ask for it.</p>
            </div>
          </div>

          {/* How-it-works steps */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 mb-6">
            <h3 className="font-extrabold text-slate-900 mb-4">What you can do now</h3>
            <div className="flex flex-col gap-3">
              {[
                { icon: <Database className="w-4 h-4 text-blue-500" />, title: "Send & Receive XLM", desc: "Transfer Stellar Lumens to anyone, instantly." },
                { icon: <Lock className="w-4 h-4 text-indigo-500" />, title: "Create Payment Links", desc: "Generate private, no-wallet payment links." },
                { icon: <Shield className="w-4 h-4 text-emerald-500" />, title: "ZK-Powered Privacy", desc: "Protected by Noir zero-knowledge proofs." },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                    <p className="text-slate-500 font-semibold text-xs">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-lg py-5 rounded-2xl shadow-[0_12px_30px_-8px_rgba(37,99,235,0.5)] hover:shadow-[0_16px_40px_-8px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-xs font-semibold text-slate-400 mt-4">
            Your keys are stored locally in your browser only.
          </p>
        </div>
      </div>
    );
  }

  // ─── READY VIEW (existing wallet) ─────────────────────────────────────────
  if (view === "ready" && wallet) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] text-slate-900 font-sans flex flex-col items-center px-4 py-10 relative">

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-50/60 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Nav */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src={logo} alt="Atreus" width={30} height={30} className="rounded-lg shadow-sm" />
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">Atreus</span>
          </Link>
          <button
            onClick={handleDelete}
            className="text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 border border-red-100"
          >
            <Trash2 className="w-4 h-4" /> Remove Wallet
          </button>
        </div>

        <div className="w-full max-w-2xl">

          {/* Wallet Header */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Public Key</span>
              <span className="font-mono text-slate-800 text-sm font-semibold break-all">{wallet.publicKey}</span>
              {wallet.email && (
                <div className="flex items-center gap-2 mt-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-600">Signed in as <span className="text-slate-900">{wallet.email}</span></span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={copyAddress} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                {addressCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              </button>
              <a href={getExplorerUrl("account", wallet.publicKey)} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                <ExternalLink className="w-4 h-4 text-blue-500" />
              </a>
            </div>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 mb-4 text-center shadow-[0_12px_40px_-10px_rgba(37,99,235,0.4)] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg preserveAspectRatio="none" viewBox="0 0 100 40" className="w-full h-full">
                <path d="M0 40 L0 28 Q10 32 20 24 T40 20 T60 12 T80 16 T100 4 L100 40 Z" fill="rgba(255,255,255,0.15)" />
                <path d="M0 28 Q10 32 20 24 T40 20 T60 12 T80 16 T100 4" fill="none" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-blue-100 font-bold text-sm mb-2 relative z-10">Total Balance</p>
            <p className="text-5xl font-black text-white tracking-tight relative z-10">
              {parseFloat(balance).toFixed(2)} <span className="text-2xl font-bold opacity-80">XLM</span>
            </p>
          </div>

          {/* Recovery Phrase */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900">Recovery Phrase</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Store these 24 words somewhere safe.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowMnemonic(!showMnemonic)} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors">
                  {showMnemonic ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Reveal</>}
                </button>
                <button onClick={copyMnemonic} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors">
                  {mnemonicCopied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {wallet.mnemonic.split(" ").map((word, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-extrabold text-slate-400">{i + 1}</span>
                  <span className="text-[12px] font-bold text-slate-800">{showMnemonic ? word : "•••••"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Go to Dashboard */}
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-lg py-5 rounded-2xl shadow-[0_12px_30px_-8px_rgba(37,99,235,0.4)] hover:shadow-[0_16px_40px_-8px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ─── LOGIN (ONBOARDING) VIEW ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAFBFF] text-slate-900 font-sans flex flex-col overflow-x-hidden relative selection:bg-blue-100">

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-blue-50/50 to-transparent rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/4" />

      {/* Navbar */}
      <nav className="w-full px-6 py-6 flex items-center justify-between z-20 relative bg-transparent">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src={logo} alt="Atreus Logo" width={28} height={28} className="rounded-lg shadow-sm" />
          <span className="text-[20px] font-extrabold text-slate-900 tracking-tight">Atreus</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-[13px] font-semibold text-slate-500">Already have a wallet?</span>
          <button
            onClick={() => setView(view === "restore" ? "login" : "restore")}
            className="px-6 py-2.5 rounded-full border border-slate-200 text-slate-800 text-[13px] font-semibold hover:bg-slate-50 transition-colors shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] bg-white"
          >
            {view === "restore" ? "Create Wallet" : "Log in"}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col relative">

        {view === "login" ? (
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between w-full mt-8 lg:mt-12 flex-1 gap-12 lg:gap-0">

            {/* Left Content (Hero) */}
            <div className="flex flex-col items-start w-full lg:w-5/12 z-10 lg:pt-16">

              <div className="inline-flex items-center gap-2 bg-green-50/80 text-green-600 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest border border-green-100 mb-8 uppercase shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                Built on Stellar
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-[72px] font-extrabold text-slate-900 leading-[1.05] tracking-tight mb-6">
                Welcome to<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Atreus</span>
              </h1>

              <p className="text-[17px] text-slate-500 font-semibold leading-relaxed mb-10 max-w-md">
                Sign in with Google to create your private, self-custodial Stellar wallet.<br className="hidden sm:block" />
                <span className="text-slate-600">Your wallet is generated securely on your device.</span>
              </p>

              <button
                onClick={() => handleGoogleLogin()}
                disabled={creating}
                className="w-full max-w-[420px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[1.25rem] p-1.5 flex items-center justify-between shadow-[0_10px_30px_-6px_rgba(37,99,235,0.4)] hover:shadow-[0_15px_40px_-8px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-1 group disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <div className="bg-white rounded-2xl p-3 shadow-md ml-0.5 flex items-center justify-center w-12 h-12 shrink-0">
                  <div className="w-6 h-6"><GoogleSVG /></div>
                </div>
                <span className="font-bold text-[16px] text-center flex-1 pr-4 tracking-wide">
                  {creating ? "Creating your wallet..." : "Continue with Google"}
                </span>
                {creating
                  ? <Loader2 className="w-5 h-5 mr-5 animate-spin shrink-0" />
                  : <ArrowRight className="w-5 h-5 mr-5 group-hover:translate-x-1.5 transition-transform opacity-90 shrink-0" />
                }
              </button>

              <div className="flex items-center gap-2 mt-6 ml-3">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] font-bold text-slate-500 tracking-wide">Secure. Private. Self-custodial.</span>
              </div>

              {error && <p className="text-red-600 mt-4 font-bold text-sm ml-2 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl shadow-sm">{error}</p>}

              {/* Feature Tags */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14 w-full max-w-[540px]">
                {[
                  { icon: <Shield className="w-5 h-5 text-green-600" />, label: "No seed phrase\nrequired" },
                  { icon: <Key className="w-5 h-5 text-green-600" />, label: "Self-custodial\nwallet" },
                  { icon: <Layers className="w-5 h-5 text-green-600" />, label: "Built on\nStellar" },
                  { icon: <Lock className="w-5 h-5 text-green-600" />, label: "Private by\ndesign" },
                ].map((tag, i) => (
                  <div key={i} className="bg-green-50/60 border border-green-100 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm hover:-translate-y-0.5 transition-transform">
                    {tag.icon}
                    <span className="text-[11px] font-bold text-slate-800 leading-[1.2] pr-2 whitespace-pre-line">{tag.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content (Visual Graphic) */}
            <div className="relative w-full lg:w-7/12 flex items-center justify-center min-h-[500px] lg:min-h-[700px] mt-10 lg:mt-0">

              {/* Glowing Rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full border-[1px] border-indigo-100/40 bg-indigo-50/20 shadow-[0_0_120px_rgba(200,200,255,0.3)] pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] sm:w-[360px] sm:h-[360px] rounded-full border-[1px] border-indigo-100/60 bg-indigo-50/40 shadow-[0_0_80px_rgba(200,200,255,0.4)] backdrop-blur-sm pointer-events-none" />

              {/* Center Logo Bubble */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] sm:w-[200px] sm:h-[200px] rounded-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] flex items-center justify-center z-10 border border-white/50">
                <Image src={logo} alt="Atreus" width={80} height={80} className="w-[60px] h-[60px] sm:w-[90px] sm:h-[90px] object-contain rounded-3xl" />
              </div>

              {/* Floating Cards */}
              <div className="absolute top-4 sm:top-12 left-4 sm:left-12 lg:-left-4 bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center gap-4 w-[220px] sm:w-[260px] hover:-translate-y-1 transition-transform z-20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 relative shadow-sm">
                  <div className="w-5 h-5 sm:w-6 sm:h-6"><GoogleSVG /></div>
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-[3px] border-2 border-white shadow-sm"><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] sm:text-[13px] font-extrabold text-slate-900 tracking-tight">Google Verified</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-[1.3] mt-1">Secure authentication with your Google account</span>
                </div>
              </div>

              <div className="absolute top-24 sm:top-32 right-0 sm:right-8 bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center gap-4 w-[220px] sm:w-[260px] hover:-translate-y-1 transition-transform z-20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 relative shadow-sm">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] sm:text-[13px] font-extrabold text-slate-900 tracking-tight">HKDF Wallet Generation</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-[1.3] mt-1">Your wallet is generated securely on your device</span>
                </div>
              </div>

              <div className="absolute bottom-28 sm:bottom-40 left-0 sm:left-12 lg:left-0 bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center gap-4 w-[220px] sm:w-[260px] hover:-translate-y-1 transition-transform z-20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 relative shadow-sm">
                  <Key className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-[3px] border-2 border-white shadow-sm"><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] sm:text-[13px] font-extrabold text-slate-900 tracking-tight">Private Keys Stay Local</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-[1.3] mt-1">Your private keys never leave your device</span>
                </div>
              </div>

              <div className="absolute bottom-6 sm:bottom-16 right-4 sm:right-16 lg:right-10 bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center gap-4 w-[220px] sm:w-[260px] hover:-translate-y-1 transition-transform z-20">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200 relative shadow-sm">
                  <Database className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-[3px] border-2 border-white shadow-sm"><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] sm:text-[13px] font-extrabold text-slate-900 tracking-tight">Soroban Smart Contracts</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 leading-[1.3] mt-1">Powered by Soroban for intelligent payments</span>
                </div>
              </div>
            </div>
          </div>

        ) : (
          /* RESTORE VIEW */
          <div className="flex flex-col items-center justify-center w-full mt-12 lg:mt-24 flex-1">
            <button onClick={() => setView("login")} className="absolute top-24 left-6 lg:left-12 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="bg-white/80 backdrop-blur-xl border border-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full max-w-xl text-center relative overflow-hidden">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                <LogIn className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Restore Wallet</h2>
              <p className="text-slate-500 font-semibold mb-8">Enter your 24-word seed phrase to regain access to your account.</p>

              <textarea
                value={mnemonicInput}
                onChange={(e) => setMnemonicInput(e.target.value)}
                placeholder="apple banana cherry dog elephant fox grape hat ice juice kite lemon..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner resize-none h-[120px] mb-6"
              />

              <button
                onClick={handleRestore}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-blue-200/50 transition-transform hover:-translate-y-0.5"
              >
                Restore Wallet
              </button>

              {error && <p className="text-red-600 mt-6 font-bold text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">{error}</p>}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Steps & Footer (Only in login view) */}
      {view === "login" && (
        <div className="w-full mt-auto relative z-10 flex flex-col items-center pb-8 pt-10 lg:pt-0">

          <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 mb-10">
            <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 lg:p-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.04)] border border-white flex flex-col xl:flex-row items-center gap-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40 pointer-events-none" />

              <div className="flex flex-col max-w-[220px] z-10 text-center xl:text-left">
                <h3 className="text-2xl font-extrabold text-slate-900 leading-tight mb-3 tracking-tight">How your wallet<br />is created</h3>
                <p className="text-[13px] text-slate-500 font-bold leading-relaxed">A secure, 4-step process<br />that puts you in control.</p>
              </div>

              <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-6 w-full z-10">
                {[
                  { step: 1, color: "blue", icon: <div className="w-7 h-7"><GoogleSVG /></div>, label: "Connect Google", desc: "Securely authenticate\nusing your Google\naccount." },
                  { step: 2, color: "indigo", icon: <Key className="w-6 h-6 text-indigo-600" />, label: "Generate Wallet", desc: "We generate your\nStellar wallet using\nadvanced cryptography." },
                  { step: 3, color: "purple", icon: <Lock className="w-6 h-6 text-purple-600" />, label: "Encrypt Locally", desc: "Your wallet is encrypted\nand stored locally on\nyour device." },
                  { step: 4, color: "green", icon: <CheckCircle2 className="w-7 h-7 text-green-600" />, label: "Wallet Ready", desc: "Your secure wallet\nis ready to use across\nAtreus." },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 w-full relative group">
                    <div className={`w-6 h-6 rounded-full bg-${s.color}-50 text-${s.color}-600 font-extrabold text-[11px] flex items-center justify-center absolute -top-3 sm:left-1/2 sm:-ml-[32px] xl:left-14 border border-${s.color}-100 shadow-sm z-20`}>{s.step}</div>
                    <div className={`w-16 h-16 rounded-2xl bg-${s.color === "blue" ? "white" : `${s.color}-50/50`} shadow-sm border border-${s.color === "blue" ? "slate" : s.color}-100 flex items-center justify-center mb-5 z-10 group-hover:-translate-y-1 transition-transform`}>
                      {s.icon}
                    </div>
                    <span className="text-[13px] font-extrabold text-slate-900 mb-2">{s.label}</span>
                    <span className="text-[11px] text-slate-500 text-center font-bold leading-[1.4] whitespace-pre-line">{s.desc}</span>
                    {i < 3 && <div className="hidden md:block absolute top-8 -right-8 xl:-right-6 w-16 xl:w-12 border-t-[3px] border-dotted border-slate-200" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="w-full flex flex-wrap items-center justify-center gap-6 md:gap-10 text-[12px] font-extrabold text-slate-500 px-6">
            {[
              { icon: <CheckCircle2 className="w-4 h-4 text-slate-400" />, text: "We never store your private keys or personal data." },
              { icon: <Layers className="w-4 h-4 text-slate-400" />, text: "Powered by Stellar" },
              { icon: <Database className="w-4 h-4 text-slate-400" />, text: "Built with Soroban" },
              { icon: <Shield className="w-4 h-4 text-slate-400" />, text: "Protected by Noir ZK" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
