"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendXLM, getBalance, getExplorerUrl } from "@/lib/wallet";
import { useWallet } from "@/components/providers";
import { 
  Send, ArrowUpRight, User, Shield, ShieldCheck,
  CheckCircle2, ExternalLink, Loader2
} from "lucide-react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

export default function SendPage() {
  const router = useRouter();
  const { publicKey, isLoading: walletLoading } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState("0.00");
  const [searchOpen, setSearchOpen] = useState(false);
  
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    setMounted(true);
    if (walletLoading) return;
    if (!publicKey) {
      router.push("/wallet");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const to = params.get("to");
    if (to) setDestination(to);

    getBalance(publicKey).then(setBalance).catch(console.error);
  }, [publicKey, walletLoading, router]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSend = async () => {
    try {
      setStatus("sending");
      setErrorMsg("");

      if (!publicKey) { router.push("/wallet"); return; }
      if (!destination.trim()) throw new Error("Enter a destination address");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");

      const bal = await getBalance(publicKey);
      if (parseFloat(bal) < parseFloat(amount) + 0.001) throw new Error("Insufficient balance");

      const hash = await sendXLM(destination.trim(), amount);
      setTxHash(hash);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Send failed");
      setStatus("error");
    }
  };

  return (
    <>
      <AppHeader title="Send XLM" subtitle="Transfer assets securely on the Stellar network" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />

      <div className="app-content flex flex-col gap-6">
        {!mounted ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : status === "success" ? (
          <div className="panel flex flex-col items-center text-center p-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-success bg-[rgba(34,197,94,0.1)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-black mb-2 text-primary">Transfer Successful</h2>
            <p className="text-sm text-secondary mb-8 max-w-sm">
              You have successfully sent <span className="text-primary font-bold">{amount} XLM</span> to the destination address.
            </p>
            
            <div className="flex items-center justify-center gap-3 w-full">
              <button onClick={() => router.push("/dashboard")} className="btn btn-lg btn-ghost">
                Back to Wallet
              </button>
              <a href={getExplorerUrl("tx", txHash)} target="_blank" rel="noopener noreferrer" className="btn btn-lg bg-[var(--accent-primary)] text-white rounded-lg">
                View Explorer <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Send Form */}
            <div className="panel flex flex-col lg:col-span-3 p-8">
              <h3 className="section-title flex items-center gap-3 mb-6" style={{ fontSize: '1.25rem' }}>
                <div className="p-2 rounded-lg bg-[rgba(59,130,246,0.1)] text-accent"><Send className="w-5 h-5" /></div>
                Transfer Details
              </h3>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-secondary ml-0.5">Destination Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-secondary" />
                    </div>
                    <input 
                      value={destination} 
                      onChange={e => setDestination(e.target.value)} 
                      placeholder="G..." 
                      className="input pl-10 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-0.5">
                    <label className="text-sm font-semibold text-secondary">Amount to Send</label>
                    <span className="text-xs text-secondary">Available: {parseFloat(balance).toLocaleString()} XLM</span>
                  </div>
                  <div className="relative flex items-center">
                    <input 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      type="number" 
                      step="0.0000001" 
                      className="input pr-20 text-lg font-bold"
                    />
                    <div className="absolute right-3 flex items-center">
                      <span className="text-sm font-black text-primary">XLM</span>
                    </div>
                  </div>
                </div>

                {status === "error" && (
                  <div className="p-3 rounded-lg text-sm font-semibold flex items-center gap-2 bg-[rgba(248,113,113,0.08)] text-error border border-[rgba(248,113,113,0.15)]">
                    <Shield className="w-4 h-4 shrink-0" /> {errorMsg}
                  </div>
                )}

                <button 
                  onClick={handleSend} 
                  disabled={status === "sending" || !destination || !amount} 
                  className="btn-primary w-full mt-2 py-3.5 rounded-lg font-bold text-base flex items-center justify-center gap-2"
                >
                  {status === "sending" ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <><ArrowUpRight className="w-5 h-5" /> Confirm Send</>
                  )}
                </button>
              </div>
            </div>

            {/* Info Card — flat panel, no gradient */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="panel p-6">
                <h3 className="font-bold text-base mb-2 text-primary">Stellar Network</h3>
                <p className="text-sm text-secondary mb-4 leading-relaxed">Transfers on the Stellar network typically finalize in 3-5 seconds and cost a fraction of a cent.</p>
                
                <div className="flex flex-col gap-2 p-3 rounded-lg bg-elevated">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary">Network Fee</span>
                    <span className="text-sm font-bold text-primary">~0.00001 XLM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary">Time</span>
                    <span className="text-sm font-bold text-primary">~4 Seconds</span>
                  </div>
                </div>
              </div>

              <div className="panel p-6">
                <div className="w-10 h-10 flex items-center justify-center mb-3 rounded-lg bg-[rgba(245,158,11,0.1)] text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base mb-1 text-primary">Safety First</h3>
                <p className="text-sm text-secondary leading-relaxed">Always double-check the destination address before sending. Cryptocurrency transactions are irreversible once confirmed on the blockchain.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
