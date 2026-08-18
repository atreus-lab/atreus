"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Bell, Check, CheckCircle2, Eye, Fingerprint,
  Globe, Key, Laptop, Loader2, Lock, Shield, ShieldAlert, Smartphone,
} from "lucide-react";
import { loadWallet } from "@/lib/wallet";

const PRIVACY_KEY = "atreus_privacy_enabled";
const LOCK_KEY = "atreus_wallet_locked";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="relative shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{ width: 44, height: 24, background: checked ? "#007CBF" : "#E5EAEF" }}
    >
      <span
        className="absolute rounded-full bg-white shadow-md transition-transform duration-200"
        style={{ width: 20, height: 20, top: 2, left: 2, transform: checked ? "translateX(20px)" : "translateX(0px)" }}
      />
    </button>
  );
}

function SettingRow({ icon, iconClass, title, desc, control }: { icon: ReactNode; iconClass: string; title: string; desc: string; control?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-grey-100 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClass}`}>{icon}</div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-grey-800">{title}</span>
          <span className="truncate text-xs text-grey-500">{desc}</span>
        </div>
      </div>
      {control}
    </div>
  );
}

interface SecurityCardProps {
  publicKey: string;
  onBack: () => void;
}

export default function SecurityCard({ publicKey, onBack }: SecurityCardProps) {
  const router = useRouter();
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [privacyEnabled, setPrivacyEnabled] = useState(true);
  const [walletLocked, setWalletLocked] = useState(false);

  useEffect(() => {
    setPrivacyEnabled(localStorage.getItem(PRIVACY_KEY) !== "false");
    setWalletLocked(localStorage.getItem(LOCK_KEY) === "true");
    setPasskeyRegistered(localStorage.getItem("atreus_passkey_registered") === "true");
  }, []);

  const handleRegisterPasskey = async () => {
    const wallet = loadWallet();
    if (!wallet) return;
    setPasskeyLoading(true);
    try {
      const { registerPasskey } = await import("@/lib/passkey");
      await registerPasskey(wallet.email || wallet.publicKey);
      localStorage.setItem("atreus_passkey_registered", "true");
      setPasskeyRegistered(true);
    } catch (err) {
      console.error("Passkey registration failed:", err);
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
    if (next) localStorage.setItem("atreus_lock_time", Date.now().toString());
    else localStorage.removeItem("atreus_lock_time");
  };

  return (
    <div className="text-center">
      <div className="flex-col text-left">
        <button onClick={onBack} className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Security</h4>
        <p className="mb-4 text-left text-sm font-normal text-grey-700 mobile:text-base">Protect your assets and manage wallet security.</p>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Shield className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-sm font-bold text-grey-800">Security Score</h3>
              <p className="text-xs text-grey-500">Your wallet is fully protected</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1">
              <Check className="h-3 w-3 text-success" />
              <span className="text-[11px] font-bold text-success">Excellent</span>
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-grey-100 bg-grey-25 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="text-[11px] font-semibold text-grey-700">No known security issues</span>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-grey-100 bg-grey-25 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="text-[11px] font-semibold text-grey-700">All protection features active</span>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-grey-100 bg-grey-25 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="text-[11px] font-semibold text-grey-700">Your recovery phrase is secure</span>
            </div>
          </div>
        </div>

        <h5 className="mb-1 mt-2 text-xs font-bold text-grey-500">Authentication</h5>
        <div className="flex flex-col">
          <SettingRow
            icon={<Key className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Recovery Phrase"
            desc="Master key to your wallet"
            control={
              <button onClick={() => router.push("/wallet")} className="flex h-9 items-center gap-1 rounded-lg border border-[#E0E7EB] px-3 text-xs font-semibold text-grey-700 transition-colors hover:bg-grey-50">
                <Eye className="h-3.5 w-3.5" /> Manage
              </button>
            }
          />
          <SettingRow
            icon={<Fingerprint className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Passkeys"
            desc={passkeyRegistered ? "1 passkey active" : "No passkeys registered"}
            control={
              <button
                onClick={handleRegisterPasskey}
                disabled={passkeyLoading}
                className="flex h-9 items-center gap-1 rounded-lg border border-[#E0E7EB] px-3 text-xs font-semibold text-grey-700 transition-colors hover:bg-grey-50 disabled:opacity-50"
              >
                {passkeyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />}
                {passkeyLoading ? "Registering..." : passkeyRegistered ? "Manage" : "Set up"}
              </button>
            }
          />
          <SettingRow
            icon={<Smartphone className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Google Authentication"
            desc="Extra layer of account security"
            control={<span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-success"><Check className="h-3 w-3" /> Enabled</span>}
          />
        </div>

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">Devices & Sessions</h5>
        <div className="flex flex-col">
          <SettingRow
            icon={<Laptop className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Trusted Devices"
            desc="MacBook Pro · macOS 14.5 · Chrome"
            control={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">Current</span>}
          />
          <SettingRow
            icon={<Globe className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Active Sessions"
            desc="Mumbai, India · 192.168.1.1 · Now"
            control={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">Current</span>}
          />
          <SettingRow
            icon={<Bell className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Security Alerts"
            desc="No security alerts — you're all set"
            control={<ShieldAlert className="h-4 w-4 text-grey-300" />}
          />
          <SettingRow
            icon={<Lock className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Transaction Approval"
            desc="Require review for all transactions"
            control={<ArrowRight className="h-4 w-4 text-grey-400" />}
          />
        </div>

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">Protection</h5>
        <div className="flex flex-col">
          <SettingRow
            icon={<Shield className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Enhanced Privacy"
            desc="Hide balance on lock"
            control={<Toggle checked={privacyEnabled} onChange={togglePrivacy} />}
          />
          <SettingRow
            icon={<Lock className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Emergency Lock"
            desc="Temporarily lock your wallet"
            control={<Toggle checked={walletLocked} onChange={handleLockWallet} />}
          />
        </div>

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">Security Activity</h5>
        <div className="flex flex-col pt-1">
          <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-grey-800">Login Successful</span>
                <span className="text-[11px] text-grey-400">Now</span>
              </div>
              <span className="text-[11px] text-grey-500">Mumbai, India · 192.168.1.1</span>
            </div>
          </div>
          <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grey-50">
              <Smartphone className="h-3.5 w-3.5 text-grey-600" />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-grey-800">2FA Enabled</span>
                <span className="text-[11px] text-grey-400">2d ago</span>
              </div>
              <span className="text-[11px] text-grey-500">Google Authentication enabled</span>
            </div>
          </div>
          <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grey-50">
              <Key className="h-3.5 w-3.5 text-grey-600" />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-grey-800">Passkey Added</span>
                <span className="text-[11px] text-grey-400">5d ago</span>
              </div>
              <span className="text-[11px] text-grey-500">New passkey registered</span>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 pt-[15px]">
          <div className="w-full mobile:w-max">
            <button onClick={onBack} className="h-11 w-full rounded-lg border border-[#E0E7EB] px-3 text-sm font-medium text-grey-700 hover:bg-grey-50 mobile:w-max mobile:text-base">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
