"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, getTransactions, type StoredWallet } from "@/lib/wallet";
import {
  Users, Plus, Send, Edit2, ShieldCheck, Smartphone, Mail,
  CheckCircle2, Network, Activity, Palette, Globe, ChevronDown, ChevronRight,
  Info, FileText
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import Toggle from "@/components/ui/Toggle";
import EmptyState from "@/components/ui/EmptyState";

export default function SettingsPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const [activeNetwork, setActiveNetwork] = useState("testnet");
  const [recommendedContacts, setRecommendedContacts] = useState<string[]>([]);

  interface AddressEntry { name: string; address: string; }
  const [addressBook, setAddressBook] = useState<AddressEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");

  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [customRpc, setCustomRpc] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [txConfirm, setTxConfirm] = useState(true);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    setAddress(wallet.publicKey);
    const pk = wallet.publicKey;
    Promise.all([getTransactions(pk, 30)])
      .then(([txs]) => {
        const seen = new Set<string>();
        txs.forEach((tx: any) => {
          if (tx.from && tx.from !== pk) seen.add(tx.from);
          if (tx.to && tx.to !== pk) seen.add(tx.to);
        });
        setRecommendedContacts(Array.from(seen).slice(0, 10));
      })
      .catch(() => {});
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Reusable setting row
  function SettingRow({ icon, iconColor, title, desc, control, onClick }: { icon: React.ReactNode; iconColor: string; title: string; desc: string; control?: React.ReactNode; onClick?: () => void }) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors ${onClick ? 'cursor-pointer' : ''} group`} onClick={onClick}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${iconColor}15`, color: iconColor }}>{icon}</div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-primary">{title}</span>
            <span className="text-[10px] text-secondary">{desc}</span>
          </div>
        </div>
        {control}
      </div>
    );
  }

  const saveContact = () => {
    if (!formName.trim() || !formAddress.trim()) return;
    if (editingIndex !== null) {
      const updated = [...addressBook];
      updated[editingIndex] = { name: formName.trim(), address: formAddress.trim() };
      setAddressBook(updated);
    } else {
      setAddressBook([...addressBook, { name: formName.trim(), address: formAddress.trim() }]);
    }
    setShowAddForm(false); setEditingIndex(null); setFormName(""); setFormAddress("");
  };

  return (
    <>
      <AppHeader title="Settings" subtitle="Configure your wallet experience" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* Network Preferences */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">Network Preferences</h3>
              <div className="flex flex-col gap-1">
                <SettingRow
                  icon={<Network className="w-4 h-4" />}
                  iconColor="var(--accent-primary)"
                  title="Active Network"
                  desc="Select the Stellar network to connect to"
                  control={
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${activeNetwork === 'testnet' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <select value={activeNetwork} onChange={e => setActiveNetwork(e.target.value)} className="bg-elevated border border-[var(--border-default)] px-3 py-1.5 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer">
                        <option value="testnet">Testnet</option>
                        <option value="mainnet">Mainnet</option>
                      </select>
                    </div>
                  }
                />
                <SettingRow
                  icon={<Activity className="w-4 h-4" />}
                  iconColor="#a855f7"
                  title="Custom RPC Node"
                  desc="Connect to a private Soroban RPC"
                  onClick={() => setCustomRpc(!customRpc)}
                  control={<Toggle checked={customRpc} onChange={setCustomRpc} />}
                />
              </div>
            </div>

            {/* Address Book */}
            <div className="panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-primary">Address Book</h3>
                <button onClick={() => { setShowAddForm(true); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(59,130,246,0.08)] text-accent flex items-center gap-1.5 transition-colors hover:bg-[rgba(59,130,246,0.12)]">
                  <Plus className="w-3.5 h-3.5" /> Add New
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {(showAddForm || editingIndex !== null) && (
                  <div className="p-3 rounded-lg bg-elevated border border-[var(--border-default)] flex flex-col gap-2">
                    <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contact name" className="input text-sm" />
                    <input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Stellar address (G...)" className="input text-sm font-mono" />
                    <div className="flex items-center gap-2">
                      <button onClick={saveContact} className="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold">{editingIndex !== null ? "Save" : "Add Contact"}</button>
                      <button onClick={() => { setShowAddForm(false); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="px-4 py-1.5 rounded-lg text-xs font-bold text-secondary hover:text-primary transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                {recommendedContacts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 my-1">
                      <div className="h-px flex-1 bg-[var(--border-default)]" />
                      <span className="section-label">Recommended</span>
                      <div className="h-px flex-1 bg-[var(--border-default)]" />
                    </div>
                    {recommendedContacts.map((addr, i) => {
                      const alreadySaved = addressBook.some(e => e.address === addr);
                      return (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-[var(--border-default)]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-[rgba(59,130,246,0.08)] text-accent">{addr.charAt(0)}</div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-sm text-primary">{addr.slice(0, 4)}...{addr.slice(-4)}</span>
                              <span className="text-[10px] font-mono text-secondary truncate">{addr}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {alreadySaved ? (
                              <span className="text-[10px] font-bold text-success">Saved</span>
                            ) : (
                              <button onClick={() => setAddressBook([...addressBook, { name: addr.slice(0, 8), address: addr }])} className="px-2 py-1 rounded-md text-[10px] font-bold bg-[rgba(59,130,246,0.08)] text-accent transition-colors hover:bg-[rgba(59,130,246,0.12)]">
                                <Plus className="w-3 h-3 inline" /> Add
                              </button>
                            )}
                            <button onClick={() => router.push(`/send?to=${addr}`)} className="p-1.5 rounded-md text-accent transition-colors hover:bg-[rgba(59,130,246,0.08)]" title="Send">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {addressBook.length === 0 && !showAddForm && recommendedContacts.length === 0 && (
                  <EmptyState icon={<Users className="w-6 h-6" />} title="No saved addresses" description="Add frequently-used addresses for quick access" />
                )}

                {addressBook.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-[rgba(59,130,246,0.08)] text-accent">{entry.name.charAt(0).toUpperCase()}</div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-primary">{entry.name}</span>
                        <span className="text-[10px] font-mono text-secondary">{entry.address.slice(0, 4)}...{entry.address.slice(-4)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => router.push(`/send?to=${entry.address}&name=${encodeURIComponent(entry.name)}`)} className="p-1.5 rounded-md text-accent transition-colors hover:bg-[rgba(59,130,246,0.08)]" title="Send">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditingIndex(i); setFormName(entry.name); setFormAddress(entry.address); setShowAddForm(false); }} className="p-1.5 rounded-md text-secondary transition-colors hover:text-primary" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* General Settings */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">General Settings</h3>
              <div className="flex flex-col gap-1">
                <SettingRow
                  icon={<span className="font-bold text-sm">$</span>}
                  iconColor="#10b981"
                  title="Base Currency"
                  desc="Used for fiat value estimation"
                  control={
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-elevated border border-[var(--border-default)] px-3 py-1.5 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer">
                      <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="JPY">JPY (¥)</option><option value="INR">INR (₹)</option>
                    </select>
                  }
                />
                <SettingRow
                  icon={<Palette className="w-4 h-4" />}
                  iconColor="#f97316"
                  title="Appearance"
                  desc="Light, Dark, or System mode"
                  control={<span className="text-xs font-bold text-secondary">Dark</span>}
                />
                <SettingRow
                  icon={<Globe className="w-4 h-4" />}
                  iconColor="var(--accent-primary)"
                  title="Language"
                  desc="Interface language"
                  control={
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-elevated border border-[var(--border-default)] px-3 py-1.5 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer">
                      <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="hi">हिन्दी</option>
                    </select>
                  }
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">Notifications</h3>
              <div className="flex flex-col gap-1">
                <SettingRow
                  icon={<Smartphone className="w-4 h-4" />}
                  iconColor="var(--accent-primary)"
                  title="Push Notifications"
                  desc="Get notified for incoming payments"
                  onClick={() => setPushNotifs(!pushNotifs)}
                  control={<Toggle checked={pushNotifs} onChange={setPushNotifs} />}
                />
                <SettingRow
                  icon={<Mail className="w-4 h-4" />}
                  iconColor="var(--accent-primary)"
                  title="Email Summaries"
                  desc="Weekly wallet activity reports"
                  onClick={() => setEmailNotifs(!emailNotifs)}
                  control={<Toggle checked={emailNotifs} onChange={setEmailNotifs} />}
                />
                <SettingRow
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  iconColor="var(--success)"
                  title="Transaction Confirmation"
                  desc="Require review before signing"
                  onClick={() => setTxConfirm(!txConfirm)}
                  control={<Toggle checked={txConfirm} onChange={setTxConfirm} />}
                />
              </div>
            </div>

            {/* About Atreus */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">About Atreus</h3>
              <div className="flex flex-col gap-1">
                <SettingRow
                  icon={<Info className="w-4 h-4" />}
                  iconColor="var(--foreground-secondary)"
                  title="Version"
                  desc="Atreus Wallet Web 1.0.0"
                  control={<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-elevated text-secondary">Up to date</span>}
                />
                <SettingRow
                  icon={<FileText className="w-4 h-4" />}
                  iconColor="var(--accent-primary)"
                  title="Terms of Service"
                  desc="Read our terms and conditions"
                  control={<ChevronRight className="w-4 h-4 text-secondary" />}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
