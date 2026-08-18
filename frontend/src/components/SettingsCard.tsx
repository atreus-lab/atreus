"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronRight, Edit2, Info, Mail, Network, Palette, Plus, Send, Smartphone } from "lucide-react";
import { getTransactions } from "@/lib/wallet";

interface AddressEntry { name: string; address: string; }

interface SettingsState {
  network: string;
  currency: string;
  language: string;
  customRpc: boolean;
  pushNotifs: boolean;
  emailNotifs: boolean;
  txConfirm: boolean;
  addressBook: AddressEntry[];
}

const DEFAULT_SETTINGS: SettingsState = {
  network: "testnet",
  currency: "USD",
  language: "en",
  customRpc: false,
  pushNotifs: true,
  emailNotifs: false,
  txConfirm: true,
  addressBook: [],
};

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem("atreus_settings");
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

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

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-10 cursor-pointer rounded-lg border border-grey-100 bg-white px-3 text-sm font-semibold text-grey-800 outline-none transition-colors hover:border-grey-200"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

interface SettingsCardProps {
  publicKey: string;
  onBack: () => void;
  onSendTo?: (address: string) => void;
}

export default function SettingsCard({ publicKey, onBack, onSendTo }: SettingsCardProps) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const update = (patch: Partial<SettingsState>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("atreus_settings", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    getTransactions(publicKey, 30)
      .then(txs => {
        const seen = new Set<string>();
        txs.forEach((tx: any) => {
          if (tx.from && tx.from !== publicKey) seen.add(tx.from);
          if (tx.to && tx.to !== publicKey) seen.add(tx.to);
        });
        setRecommended(Array.from(seen).slice(0, 5));
      })
      .catch(() => {});
  }, [publicKey]);

  const saveContact = () => {
    if (!formName.trim() || !formAddress.trim()) return;
    const book = [...settings.addressBook];
    if (editingIndex !== null) {
      book[editingIndex] = { name: formName.trim(), address: formAddress.trim() };
    } else {
      book.push({ name: formName.trim(), address: formAddress.trim() });
    }
    update({ addressBook: book });
    setShowAddForm(false);
    setEditingIndex(null);
    setFormName("");
    setFormAddress("");
  };

  const inputCls = "!h-11 w-full rounded-lg border border-solid border-grey-100 !bg-white px-4 py-2 text-left text-grey-800 outline-none focus:border-[#007CBF]";

  return (
    <div className="text-center">
      <div className="flex-col text-left">
        <button onClick={onBack} className="mb-3.5 mr-auto flex w-max cursor-pointer items-center justify-start gap-1 text-sm font-semibold text-grey-700 hover:opacity-70">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h4 className="mb-3 flex w-full items-center justify-start text-left text-lg font-bold text-grey-800 mobile:text-[26px]">Settings</h4>
        <p className="mb-4 text-left text-sm font-normal text-grey-700 mobile:text-base">Configure your wallet experience.</p>

        <h5 className="mb-1 mt-2 text-xs font-bold text-grey-500">Network Preferences</h5>
        <div className="flex flex-col">
          <SettingRow
            icon={<Network className="h-4 w-4 text-accent" />}
            iconClass="bg-blue-50"
            title="Active Network"
            desc="Select the Stellar network to connect to"
            control={
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${settings.network === 'testnet' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <Select value={settings.network} onChange={v => update({ network: v })} options={[{ value: "testnet", label: "Testnet" }, { value: "mainnet", label: "Mainnet" }]} />
              </div>
            }
          />
          <SettingRow
            icon={<Network className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Custom RPC Node"
            desc="Connect to a private Soroban RPC"
            control={<Toggle checked={settings.customRpc} onChange={v => update({ customRpc: v })} />}
          />
        </div>

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">Address Book</h5>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-grey-400">{settings.addressBook.length} saved</span>
          <button onClick={() => { setShowAddForm(true); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 active:bg-blue-200">
            <Plus className="h-3.5 w-3.5" /> Add New
          </button>
        </div>
        <div className="mt-1 flex flex-col">
          {(showAddForm || editingIndex !== null) && (
            <div className="mb-2 flex flex-col gap-2 rounded-lg border border-grey-100 bg-white p-3">
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contact name" className={inputCls} />
              <input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Stellar address (G...)" className={`${inputCls} font-mono`} />
              <div className="flex items-center gap-2">
                <button onClick={saveContact} disabled={!formName.trim() || !formAddress.trim()} className="flex h-9 items-center gap-1 rounded-lg bg-primaryBlue px-3 text-xs font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" /> {editingIndex !== null ? "Save" : "Add Contact"}
                </button>
                <button onClick={() => { setShowAddForm(false); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="h-9 rounded-lg border border-[#E0E7EB] px-3 text-xs font-semibold text-grey-700 hover:bg-grey-50">Cancel</button>
              </div>
            </div>
          )}

          {recommended.map((addr, i) => {
            const saved = settings.addressBook.some(e => e.address === addr);
            return (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-grey-100 py-3 last:border-b-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">{addr.charAt(0)}</div>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold text-grey-800">{addr.slice(0, 4)}...{addr.slice(-4)}</span>
                    <span className="truncate font-mono text-xs text-grey-500">{addr}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {saved ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-success">Saved</span>
                  ) : (
                    <button onClick={() => update({ addressBook: [...settings.addressBook, { name: addr.slice(0, 8), address: addr }] })} className="flex h-7 items-center gap-1 rounded-lg bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  )}
                  <button onClick={() => onSendTo?.(addr)} className="flex h-7 w-7 items-center justify-center rounded-full bg-grey-50 text-grey-600 transition-colors hover:bg-grey-100" title="Send">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {settings.addressBook.map((entry, i) => (
            <div key={i} className="flex items-center justify-between gap-3 border-b border-grey-100 py-3 last:border-b-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">{entry.name.charAt(0).toUpperCase()}</div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-grey-800">{entry.name}</span>
                  <span className="truncate font-mono text-xs text-grey-500">{entry.address.slice(0, 4)}...{entry.address.slice(-4)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button onClick={() => onSendTo?.(entry.address)} className="flex h-7 w-7 items-center justify-center rounded-full bg-grey-50 text-grey-600 transition-colors hover:bg-grey-100" title="Send">
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setEditingIndex(i); setFormName(entry.name); setFormAddress(entry.address); setShowAddForm(false); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-grey-50 text-grey-600 transition-colors hover:bg-grey-100" title="Edit">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {settings.addressBook.length === 0 && recommended.length === 0 && !showAddForm && (
            <div className="py-4 text-center text-xs text-grey-400">No saved addresses yet</div>
          )}
        </div>

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">General Settings</h5>
        <div className="flex flex-col">
          <SettingRow
            icon={<span className="text-sm font-bold text-grey-700">$</span>}
            iconClass="bg-green-50"
            title="Base Currency"
            desc="Used for fiat value estimation"
            control={<Select value={settings.currency} onChange={v => update({ currency: v })} options={[{ value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" }, { value: "GBP", label: "GBP (£)" }, { value: "JPY", label: "JPY (¥)" }, { value: "INR", label: "INR (₹)" }]} />}
          />
          <SettingRow
            icon={<Palette className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Appearance"
            desc="Light, Dark, or System mode"
            control={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">Light</span>}
          />
          <SettingRow
            icon={<Network className="h-4 w-4 text-accent" />}
            iconClass="bg-blue-50"
            title="Language"
            desc="Interface language"
            control={<Select value={settings.language} onChange={v => update({ language: v })} options={[{ value: "en", label: "English" }, { value: "es", label: "Español" }, { value: "fr", label: "Français" }, { value: "de", label: "Deutsch" }, { value: "hi", label: "हिन्दी" }]} />}
          />
        </div>

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">Notifications</h5>
        <div className="flex flex-col">
          <SettingRow
            icon={<Smartphone className="h-4 w-4 text-accent" />}
            iconClass="bg-blue-50"
            title="Push Notifications"
            desc="Get notified for incoming payments"
            control={<Toggle checked={settings.pushNotifs} onChange={v => update({ pushNotifs: v })} />}
          />
          <SettingRow
            icon={<Mail className="h-4 w-4 text-accent" />}
            iconClass="bg-blue-50"
            title="Email Summaries"
            desc="Weekly wallet activity reports"
            control={<Toggle checked={settings.emailNotifs} onChange={v => update({ emailNotifs: v })} />}
          />
          <SettingRow
            icon={<Check className="h-4 w-4 text-success" />}
            iconClass="bg-green-50"
            title="Transaction Confirmation"
            desc="Require review before signing"
            control={<Toggle checked={settings.txConfirm} onChange={v => update({ txConfirm: v })} />}
          />
        </div>

        <h5 className="mb-1 mt-5 text-xs font-bold text-grey-500">About Atreus</h5>
        <div className="flex flex-col">
          <SettingRow
            icon={<Info className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Version"
            desc="Atreus Wallet Web 1.0.0"
            control={<span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-success">Up to date</span>}
          />
          <SettingRow
            icon={<Info className="h-4 w-4 text-grey-600" />}
            iconClass="bg-grey-50"
            title="Terms of Service"
            desc="Read our terms and conditions"
            control={<ChevronRight className="h-4 w-4 text-grey-400" />}
          />
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