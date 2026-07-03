"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "motion/react";
import { loadWallet } from "@/lib/wallet";
import { ArrowUpRight, Rocket, Link as LinkIcon, DollarSign, CheckCircle2, Shield, Layers, Zap, Lock, Wallet, Percent, Twitter, Linkedin, Github, Menu, X } from "lucide-react";
import logo from "../media/ateruslogo.jpeg";
import mobileImg from "../media/ateruslandpto.png";
import boltImg from "../media/bolt.png";
import lockImg from "../media/lock.png";
import assetsImg from "../media/assets.png";
import earthImg from "../media/ateruseart.png";
import clockImg from "../media/clock.png";
import shieldImg from "../media/lastcard.png";
import Beams from "../components/Beams";
import ShinyText from "../components/ShinyText";
import BorderGlow from "../components/BorderGlow";
import Grainient from "../components/Grainient";
import { InteractiveHowItWorks } from "../components/InteractiveHowItWorks";
import { MultiChainSwap } from "@/components/motion/swap";
import { NumberTicker } from "@/components/motion/number-ticker";
import { EASE_OUT, SPRING_PRESS } from "@/lib/ease";

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.52, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.52, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [hasWallet, setHasWallet] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkWallet = async () => {
      try {
        const pk = await loadWallet();
        setHasWallet(!!pk);
      } catch {
        setHasWallet(false);
      }
    };
    checkWallet();
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white overflow-y-auto font-sans flex flex-col z-[100]">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px]" />
        <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% via-black/20 to-black pointer-events-none"></div>
      </div>

      <motion.nav
        initial={{ opacity: 0, y: -8, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl mx-auto px-8 py-3 mt-4 flex items-center justify-between z-20 relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-xl"
      >
        <div className="flex lg:hidden items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <Image src={logo} alt="Atreus Logo" width={28} height={28} className="rounded-lg shadow-sm" />
            <span className="text-[19px] font-extrabold text-white tracking-tight">Atreus</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={hasWallet ? "/dashboard" : "/wallet"}
              className="inline-flex items-center gap-2 bg-white text-black hover:bg-slate-200 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-md"
            >
              {hasWallet ? "Dashboard" : "Launch"}
            </Link>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-between w-full">
          <div className="flex items-center gap-6 flex-1">
            <Link href="/" className="text-[13px] font-semibold text-white tracking-wide hover:text-slate-300 transition-colors">Home</Link>
            <Link href="#features" className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors tracking-wide">Features</Link>
            <Link href="#how-it-works" className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors tracking-wide">How It Works</Link>
            <Link href="#security" className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors tracking-wide">Security</Link>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
            <Image src={logo} alt="Atreus Logo" width={28} height={28} className="rounded-lg shadow-sm" />
            <span className="text-[19px] font-extrabold text-white tracking-tight">Atreus</span>
          </div>

          <div className="flex items-center justify-end gap-6 flex-1">
            <div className="flex items-center gap-6">
              <Link href="#about" className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors tracking-wide">About</Link>
              <Link href="#docs" className="text-[13px] font-semibold text-slate-400 hover:text-white transition-colors tracking-wide">Docs</Link>
            </div>

            <Link
              href={hasWallet ? "/dashboard" : "/wallet"}
              className="inline-flex items-center gap-2 bg-white text-black hover:bg-slate-200 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all shadow-[0_4px_12px_-4px_rgba(255,255,255,0.3)]"
            >
              {hasWallet ? "Dashboard" : "Launch Wallet"}
              <ArrowUpRight className="w-3.5 h-3.5 text-black" />
            </Link>
          </div>
        </div>
      </motion.nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-12 pb-24 flex flex-col relative">
        <div className="flex flex-col lg:flex-row items-center justify-between w-full h-full gap-16 lg:gap-8">

          <div className="w-full lg:w-1/2 flex flex-col items-start gap-6 z-10 pt-8 lg:pt-0">
            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.52, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white font-bold text-[10px] tracking-widest shadow-lg border border-white/20 backdrop-blur-md"
            >
              <div className="relative flex h-1.5 w-1.5">
                <div className="absolute inset-0 rounded-full bg-white/50 animate-ping opacity-75"></div>
                <div className="relative rounded-full h-1.5 w-1.5 bg-white"></div>
              </div>
              BUILT ON STELLAR
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.52, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl lg:text-[4.5rem] font-extrabold tracking-tight text-white leading-[1.1] mt-2 flex flex-col"
            >
              <ShinyText text="Send. Receive." disabled={false} speed={3} className="text-white" />
              <span>Build. <span className="text-slate-300">Beyond.</span></span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.52, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg lg:text-xl text-slate-400 max-w-lg leading-relaxed font-medium mt-2"
            >
              Atreus is the easiest way to send and receive funds on Stellar. Secure, private, and no wallet required for the recipient.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.52, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-3 mt-6"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={SPRING_PRESS}>
                <Link href={hasWallet ? "/dashboard" : "/wallet"} className="group relative inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-200 text-black px-7 py-3 rounded-full text-[13px] font-semibold transition-all shadow-[0_8px_24px_rgb(255,255,255,0.15)] hover:-translate-y-0.5">
                  <span className="relative z-10 flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    {hasWallet ? "Dashboard" : "Launch Wallet"}
                  </span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={SPRING_PRESS}>
                <Link href="/create" className="group relative inline-flex items-center justify-center gap-2.5 bg-white/[0.06] backdrop-blur-xl border border-white/15 hover:bg-white/[0.12] hover:border-white/30 text-white px-6 py-3 rounded-full text-[13px] font-semibold transition-all hover:-translate-y-0.5">
                  <LinkIcon className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  Create Link
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={SPRING_PRESS}>
                <Link href="/claim" className="group relative inline-flex items-center justify-center gap-2.5 bg-white/[0.06] backdrop-blur-xl border border-white/15 hover:bg-white/[0.12] hover:border-white/30 text-white px-6 py-3 rounded-full text-[13px] font-semibold transition-all hover:-translate-y-0.5">
                  <DollarSign className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  Claim Funds
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.52, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-6 mt-8 text-sm font-semibold text-slate-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-white/80" />
                Non-custodial
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-white/80" />
                Secure
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-white/80" />
                Built on Stellar & Soroban
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.72, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full lg:w-1/2 flex items-center justify-center lg:justify-end mt-16 lg:mt-0 min-h-[550px]"
          >
            <div className="dark relative w-full max-w-[380px] mx-auto lg:ml-auto lg:mr-0 lg:translate-x-8 z-10 animate-float shadow-2xl rounded-3xl">
              <MultiChainSwap />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
          className="w-full mt-24 mb-12 grid grid-cols-3 gap-8 px-4"
        >
          {[
            { value: 10000, label: "Transactions", prefix: "$", suffix: "+" },
            { value: 5000, label: "Active Users", suffix: "+" },
            { value: 99.9, label: "Uptime", suffix: "%" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-1 py-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                <NumberTicker value={stat.value} duration={1.5} suffix={stat.suffix} prefix={stat.prefix} startOnView />
              </span>
              <span className="text-sm font-medium text-slate-500">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        <Reveal delay={0.1}>
          <div id="features" className="w-full mb-8">
            <BorderGlow
              edgeSensitivity={30}
              glowColor="0 0 100"
              backgroundColor="#000000"
              borderRadius={32}
              className="w-full shadow-2xl"
              colors={['#ffffff', '#94a3b8', '#e2e8f0']}
            >
              <div className="bg-white/5 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4 divide-y md:divide-y-0 lg:divide-x divide-white/10 rounded-[2rem]">
                {[
                  { icon: Wallet, title: "No Wallet Required", desc: "Recipients don't need a wallet to receive funds." },
                  { icon: Shield, title: "Non-Custodial", desc: "You have full control over your funds." },
                  { icon: LinkIcon, title: "On-Chain & Verifiable", desc: "Transparent transactions on Stellar blockchain." },
                  { icon: Zap, title: "Lightning Fast", desc: "Send and receive in seconds." },
                  { icon: Percent, title: "Low Fees", desc: "Keep more of what you send." },
                ].map((feat, i) => (
                  <StaggerItem key={i} index={i}>
                    <div className={`flex flex-col gap-3 px-4 ${i === 0 ? 'pt-4 md:pt-0 lg:border-l-0' : i < 2 ? 'pt-6 md:pt-0 border-t border-white/10 md:border-t-0' : 'pt-6 lg:pt-0 border-t border-white/10 lg:border-t-0'}`}>
                      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-1">
                        <feat.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-extrabold text-[15px] text-white">{feat.title}</h3>
                      <p className="text-[13px] text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </div>
            </BorderGlow>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div id="how-it-works" className="w-full mt-32 mb-8 scroll-mt-20">
            <div className="flex flex-col items-center text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold tracking-widest mb-6 backdrop-blur-md"
              >
                HOW IT WORKS
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4"
              >
                Receive funds in <span className="text-slate-300">3 simple steps</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg text-slate-400 max-w-xl font-medium"
              >
                No wallet needed for the recipient. Just create, share, and they claim.
              </motion.p>
            </div>

            <div className="px-4">
              <InteractiveHowItWorks />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div id="security" className="w-full mt-32 mb-8 scroll-mt-20">
            <div className="flex flex-col items-center text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold tracking-widest mb-6 backdrop-blur-md"
              >
                <Shield className="w-3.5 h-3.5" />
                SECURITY
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight"
              >
                Your funds are <span className="text-slate-300">protected</span> by ZK proofs
              </motion.h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-2 flex flex-col relative overflow-hidden min-h-[400px] shadow-2xl"
              >
                <div className="absolute inset-0 w-full h-full p-2 pointer-events-none">
                  <div className="w-full h-full relative rounded-[1.5rem] overflow-hidden">
                    <Image src={assetsImg} alt="Assets connection" fill className="object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  </div>
                </div>
                <div className="relative z-10 p-8 mt-auto">
                  <h3 className="text-3xl font-bold text-white mb-3">Multi-Chain Connection</h3>
                  <p className="text-slate-300 text-lg max-w-md">Bridge and swap assets effortlessly across networks with unified liquidity.</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-1 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-2 flex flex-col relative overflow-hidden min-h-[400px] shadow-2xl"
              >
                <div className="absolute inset-0 w-full h-full p-2 pointer-events-none">
                  <div className="w-full h-full relative rounded-[1.5rem] overflow-hidden">
                    <Image src={earthImg} alt="Global network" fill className="object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  </div>
                </div>
                <div className="relative z-10 p-8 mt-auto">
                  <h3 className="text-3xl font-bold text-white mb-3">Global Scale</h3>
                  <p className="text-slate-300 text-lg">Borderless transactions settling in seconds anywhere on Earth.</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 flex flex-col overflow-hidden min-h-[350px] relative group hover:bg-white/10 transition-colors duration-300 shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-transparent pointer-events-none"></div>
                <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Learning Center for Every Experience Level</h3>
                <p className="text-slate-400 relative z-10 text-sm leading-relaxed mb-8">We provide educational materials to help our users better understand the world of cryptocurrencies and make more informed trading decisions.</p>
                <div className="mt-auto bg-black/40 border border-white/10 rounded-2xl p-5 flex items-center justify-between relative z-10 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center overflow-hidden"><img src="https://i.pravatar.cc/100?img=33" alt="Mentor 1" className="w-full h-full object-cover" /></div>
                      <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center overflow-hidden"><img src="https://i.pravatar.cc/100?img=47" alt="Mentor 2" className="w-full h-full object-cover" /></div>
                      <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center overflow-hidden"><img src="https://i.pravatar.cc/100?img=12" alt="Mentor 3" className="w-full h-full object-cover" /></div>
                    </div>
                    <span className="text-xs text-slate-300 font-bold ml-1">+40</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-white text-sm font-bold">Professional</p>
                    <p className="text-white text-sm font-bold flex items-center gap-1">Mentors <ArrowUpRight className="w-3 h-3 text-pink-400" /></p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-2 flex flex-col overflow-hidden min-h-[350px] relative group shadow-2xl"
              >
                <div className="absolute inset-0 w-full h-full p-2 pointer-events-none">
                  <div className="w-full h-full relative rounded-[1.5rem] overflow-hidden">
                    <Image src={clockImg} alt="Security Monitoring" fill className="object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  </div>
                </div>
                <div className="relative z-10 p-6 flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-white mb-4">Strong Encryption & Security Monitoring</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">Additionally, we adhere to strict KYC/AML regulations and use industry-standard encryption protocols (AES-256, SSL/TLS) to safeguard sensitive data.</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-2 flex flex-col overflow-hidden min-h-[350px] relative group shadow-2xl"
              >
                <div className="absolute inset-0 w-full h-full p-2 pointer-events-none">
                  <div className="w-full h-full relative rounded-[1.5rem] overflow-hidden">
                    <Image src={shieldImg} alt="Security Audits" fill className="object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  </div>
                </div>
                <div className="relative z-10 p-6 flex flex-col h-full">
                  <h3 className="text-2xl font-bold text-white mb-4">Independent Audited & ISO Certified</h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">We regularly undergo audits by reputable third-party security auditing firms to identify and fix potential vulnerabilities.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div id="about" className="w-full mt-40 mb-16 scroll-mt-20 px-4 md:px-0">
            <div className="flex flex-col items-center text-center mb-8">
              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 bg-transparent border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-bold tracking-widest mb-8"
              >
                ABOUT
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl lg:text-7xl font-extrabold text-white tracking-tighter mb-6"
              >
                Built for <ShinyText text="real-world" disabled={false} speed={3} className="inline-block" /> payments.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.52, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-xl text-slate-400 max-w-3xl font-medium leading-relaxed"
              >
                Atreus is a non-custodial payment platform built on the Stellar network and Soroban smart contracts. 
                We make it easy to send and receive funds securely — no wallet required for the recipient.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.52, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col md:flex-row mt-24 pt-12 border-t border-white/10 relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-[2px]"></div>

              <div className="flex-1 md:pr-12 md:border-r border-white/10 flex flex-col gap-5 py-8 md:py-0">
                <Layers className="w-8 h-8 text-white mb-2" />
                <h3 className="font-black text-2xl text-white tracking-tight">Stellar-Powered</h3>
                <p className="text-lg text-slate-400 font-medium leading-relaxed">Leveraging Stellar's fast, low-cost network for borderless transactions settling globally.</p>
              </div>

              <div className="flex-1 md:px-12 md:border-r border-white/10 flex flex-col gap-5 py-8 md:py-0 border-t md:border-t-0 border-white/10">
                <Lock className="w-8 h-8 text-white mb-2" />
                <h3 className="font-black text-2xl text-white tracking-tight">Privacy First</h3>
                <p className="text-lg text-slate-400 font-medium leading-relaxed">Zero-knowledge proofs ensure that only the intended recipient can ever access the funds.</p>
              </div>

              <div className="flex-1 md:pl-12 flex flex-col gap-5 py-8 md:py-0 border-t md:border-t-0 border-white/10">
                <Zap className="w-8 h-8 text-white mb-2" />
                <h3 className="font-black text-2xl text-white tracking-tight">Instant Settlement</h3>
                <p className="text-lg text-slate-400 font-medium leading-relaxed">Transactions settle in seconds, not days. Funds arrive exactly when they are needed.</p>
              </div>
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div id="docs" className="w-full mt-16 mb-4 scroll-mt-20">
            <div className="relative rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
              <div className="absolute inset-0 z-0">
                <Grainient
                  color1="#cdcdcd"
                  color2="#67666a"
                  color3="#3d3b3f"
                  timeSpeed={0.95}
                  colorBalance={0}
                  warpStrength={1}
                  warpFrequency={5}
                  warpSpeed={2}
                  warpAmplitude={50}
                  blendAngle={0}
                  blendSoftness={0.05}
                  rotationAmount={500}
                  noiseScale={2}
                  grainAmount={0.1}
                  grainScale={2}
                  grainAnimated={false}
                  contrast={1.5}
                  gamma={1}
                  saturation={1}
                  centerX={0}
                  centerY={0}
                  zoom={0.9}
                />
              </div>

              <div className="relative z-10 p-10 lg:p-14 text-white flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold tracking-widest self-start shadow-lg">
                    DOCUMENTATION
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
                    Ready to build with Atreus?
                  </h2>
                  <p className="text-base text-slate-300 max-w-lg font-medium">
                    Explore our documentation, API references, and integration guides to start building on Atreus today.
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <a href="https://github.com/atreus-lab/atreus" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-xl hover:bg-black/60 border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-xl">
                      GitHub Repository
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                    <a href="/docs/architecture.md" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-xl hover:bg-black/60 border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-xl">
                      Architecture Docs
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <div className="w-32 h-32 rounded-[2rem] bg-black/40 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-md">
                  <Image src={logo} alt="Atreus" width={64} height={64} className="rounded-2xl opacity-80 grayscale" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

      </main>

      <footer className="w-full relative overflow-hidden pt-12 pb-16 bg-black z-10 mt-0 flex flex-col items-center shrink-0">
        <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center pointer-events-none select-none overflow-hidden z-0">
          <h1 className="text-[25vw] font-black text-white/[0.08] leading-[0.75] tracking-tighter whitespace-nowrap">ATREUS</h1>
        </div>

        <Reveal delay={0.1}>
          <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
            <div className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2rem] p-8 md:p-12 shadow-2xl">

              <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">

                <div className="lg:w-1/3 flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <Image src={logo} alt="Atreus Logo" width={32} height={32} className="rounded-xl shadow-lg grayscale opacity-80" />
                    <span className="text-xl font-bold text-white tracking-tight">Atreus</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                    Atreus empowers teams to transform raw crypto into clear, compelling payments — making transfers easier to share, understand, and act on.
                  </p>
                  <div className="flex gap-4 mt-2">
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/5 transition-colors">
                      <Twitter className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/5 transition-colors">
                      <Linkedin className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
                    </a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/5 transition-colors">
                      <Github className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
                    </a>
                  </div>
                </div>

                <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-3 gap-8">
                  <div className="flex flex-col gap-4">
                    <h4 className="text-white font-bold text-sm mb-2">Product</h4>
                    <Link href="#features" className="text-slate-400 hover:text-white text-sm transition-colors">Features</Link>
                    <Link href="#pricing" className="text-slate-400 hover:text-white text-sm transition-colors">Pricing</Link>
                    <Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Integrations</Link>
                    <Link href="#changelog" className="text-slate-400 hover:text-white text-sm transition-colors">Changelog</Link>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h4 className="text-white font-bold text-sm mb-2">Resources</h4>
                    <Link href="#docs" className="text-slate-400 hover:text-white text-sm transition-colors">Documentation</Link>
                    <Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Tutorials</Link>
                    <Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Blog</Link>
                    <Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Support</Link>
                  </div>
                  <div className="flex flex-col gap-4">
                    <h4 className="text-white font-bold text-sm mb-2">Company</h4>
                    <Link href="#about" className="text-slate-400 hover:text-white text-sm transition-colors">About</Link>
                    <Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Careers</Link>
                    <Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Contact</Link>
                    <Link href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Partners</Link>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-sm text-slate-500">
                  © 2026 Atreus. All rights reserved.
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <Link href="#" className="text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</Link>
                  <Link href="#" className="text-slate-500 hover:text-slate-300 transition-colors">Terms of Service</Link>
                  <Link href="#" className="text-slate-500 hover:text-slate-300 transition-colors">Cookie Settings</Link>
                </div>
              </div>

            </div>
          </div>
        </Reveal>
      </footer>

      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col"
            >
              <div className="px-6 pt-8 pb-4 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Image src={logo} alt="Atreus Logo" width={28} height={28} className="rounded-lg shadow-sm" />
                  <span className="text-[19px] font-extrabold text-slate-900 tracking-tight">Atreus</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_PRESS}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </motion.button>
              </div>

              <nav className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-1.5 py-4">
                {[
                  { href: "/", icon: "Home", label: "Home" },
                  { href: "#features", icon: "Features", label: "Features" },
                  { href: "#how-it-works", icon: "How It Works", label: "How It Works" },
                  { href: "#security", icon: "Security", label: "Security" },
                  { href: "#about", icon: "About", label: "About" },
                  { href: "#docs", icon: "Docs", label: "Docs" },
                ].map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="h-px bg-slate-100 my-4"></div>

                <Link
                  href={hasWallet ? "/dashboard" : "/wallet"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3.5 rounded-2xl text-sm font-bold transition-all hover:bg-slate-800 shadow-md mt-2"
                >
                  {hasWallet ? "Go to Dashboard" : "Launch Wallet"}
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </nav>

              <div className="px-6 pb-6 pt-3 shrink-0">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Built on Stellar</span>
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
                  </div>
                  <p className="text-[12px] font-medium text-slate-500 leading-snug">Fast. Low cost. Borderless payments.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
