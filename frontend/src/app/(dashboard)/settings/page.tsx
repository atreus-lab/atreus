"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, getTransactions, type StoredWallet } from "@/lib/wallet";
import { 
  Users, Plus, Send, Edit2, ShieldCheck, Smartphone, Mail, 
  CheckCircle2, Network, Activity, Palette, Globe, ChevronDown,  ChevronRight,
  Info, FileText
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

export default function SettingsPage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const [activeNetwork, setActiveNetwork] = useState("testnet");
  const [recommendedContacts, setRecommendedContacts] = useState<string[]>([]);

  interface AddressEntry {
    name: string;
    address: string;
  }
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
    if (!wallet) {
      router.push("/wallet");
      return;
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <AppHeader title="Settings" subtitle="Configure your wallet experience" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column */}
          <div className="flex flex-col gap-8">
           
            {/* Network Preferences Card */}
            <div className="panel flex flex-col">
              <h3 className="section-title" style={{ fontSize: '1.5rem' }}>Network Preferences</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors gap-4" style={{ border: '1px solid transparent' }}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><Network className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Active Network</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Select the Stellar network to connect to</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className={`w-2.5 h-2.5 rounded-full ${activeNetwork === 'testnet' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'} shrink-0`}></div>
                    <select value={activeNetwork} onChange={e => setActiveNetwork(e.target.value)} className="px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:border-indigo-300 transition-colors appearance-none cursor-pointer outline-none" style={{ background: 'var(--background-elevated)', borderColor: 'var(--border-default)', color: 'var(--foreground-primary)' }}>
                      <option value="testnet" className="font-bold">Testnet</option>
                      <option value="mainnet" className="font-bold">Mainnet</option>
                    </select>
                  </div>
                </div>
                
                <div className="h-px ml-20 my-1.5" style={{ background: 'var(--border-default)', height: '1px' }}></div>

                <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group" style={{ border: '1px solid transparent' }} onClick={() => setCustomRpc(!customRpc)}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}><Activity className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Custom RPC Node</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Connect to a private Soroban RPC</span>
                    </div>
                  </div>
                  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${customRpc ? 'bg-indigo-600' : ''}`} style={{ background: !customRpc ? 'var(--border-default)' : undefined }}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${customRpc ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Book Card */}
            <div className="panel flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="section-title" style={{ fontSize: '1.5rem' }}>Address Book</h3>
                <button onClick={() => { setShowAddForm(true); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}>
                  <Plus className="w-4 h-4"/> Add New
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                {(showAddForm || editingIndex !== null) && (
                  <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ background: 'rgba(238,242,255,0.5)', border: '1px solid var(--border-default)' }}>
                    <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contact name" className="w-full p-3 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', color: 'var(--foreground-primary)' }} />
                    <input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Stellar address (G...)" className="w-full p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', color: 'var(--foreground-primary)' }} />
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        if (!formName.trim() || !formAddress.trim()) return;
                        if (editingIndex !== null) {
                          const updated = [...addressBook];
                          updated[editingIndex] = { name: formName.trim(), address: formAddress.trim() };
                          setAddressBook(updated);
                        } else {
                          setAddressBook([...addressBook, { name: formName.trim(), address: formAddress.trim() }]);
                        }
                        setShowAddForm(false);
                        setEditingIndex(null);
                        setFormName("");
                        setFormAddress("");
                      }} className="btn btn-sm" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                        {editingIndex !== null ? "Save" : "Add Contact"}
                      </button>
                      <button onClick={() => { setShowAddForm(false); setEditingIndex(null); setFormName(""); setFormAddress(""); }} className="btn btn-sm btn-ghost">Cancel</button>
                    </div>
                  </div>
                )}

                {recommendedContacts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-1 mb-1">
                      <div className="h-px flex-1" style={{ background: 'var(--border-default)', height: '1px' }}></div>
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>Recommended</span>
                      <div className="h-px flex-1" style={{ background: 'var(--border-default)', height: '1px' }}></div>
                    </div>
                    {recommendedContacts.map((addr, i) => {
                      const alreadySaved = addressBook.some(e => e.address === addr);
                      return (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(239,246,255,0.3)', border: '1px solid var(--border-default)' }}>
                          <div className="flex items-center gap-5 min-w-0">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm shrink-0" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}>{addr.charAt(0)}</div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>{addr.slice(0, 4)}...{addr.slice(-4)}</span>
                              <span className="text-xs font-mono font-semibold mt-0.5 truncate" style={{ color: 'var(--foreground-secondary)' }}>{addr}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {alreadySaved ? (
                              <span className="text-[11px] font-bold rounded-lg" style={{ color: '#10b981', background: 'rgba(16,185,129,0.15)' }}>Saved</span>
                            ) : (
                              <button onClick={() => setAddressBook([...addressBook, { name: addr.slice(0, 8), address: addr }])} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}>
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            )}
                            <button onClick={() => router.push(`/send?to=${addr}`)} className="p-2 rounded-lg transition-colors hover:bg-blue-500/10" style={{ color: 'var(--accent-primary)' }} title="Send to this address">
                              <Send className="w-4 h-4"/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {addressBook.length === 0 && !showAddForm && recommendedContacts.length === 0 && (
                  <div className="flex flex-col items-center py-8" style={{ color: 'var(--foreground-secondary)' }}>
                    <Users className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No saved addresses</p>
                    <p className="text-xs mt-1">Add frequently-used addresses for quick access</p>
                  </div>
                )}

                {addressBook.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(248,250,252,0.5)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>{entry.name.charAt(0).toUpperCase()}</div>
                      <div className="flex flex-col">
                        <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>{entry.name}</span>
                        <span className="text-xs font-mono font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>{entry.address.slice(0, 4)}...{entry.address.slice(-4)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => router.push(`/send?to=${entry.address}&name=${encodeURIComponent(entry.name)}`)} className="p-2 rounded-lg transition-colors hover:bg-indigo-50" style={{ color: 'var(--accent-primary)' }} title="Send to this address">
                        <Send className="w-5 h-5"/>
                      </button>
                      <button onClick={() => { setEditingIndex(i); setFormName(entry.name); setFormAddress(entry.address); setShowAddForm(false); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--foreground-secondary)' }} title="Edit this address">
                        <Edit2 className="w-5 h-5"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8">
           
            {/* General Settings Card */}
            <div className="panel flex flex-col">
              <h3 className="section-title" style={{ fontSize: '1.5rem' }}>General Settings</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors gap-4" style={{ border: '1px solid transparent' }}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}><span className="font-bold text-lg">$</span></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Base Currency</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Used for fiat value estimation</span>
                    </div>
                  </div>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:border-emerald-300 transition-colors appearance-none cursor-pointer outline-none w-full sm:w-auto" style={{ background: 'var(--background-elevated)', borderColor: 'var(--border-default)', color: 'var(--foreground-primary)' }}>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="NGN">NGN (₦)</option>
                    <option value="KRW">KRW (₩)</option>
                    <option value="BRL">BRL (R$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="CHF">CHF (Fr)</option>
                    <option value="RUB">RUB (₽)</option>
                    <option value="MXN">MXN (Mex$)</option>
                    <option value="ZAR">ZAR (R)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="HKD">HKD (HK$)</option>
                    <option value="SEK">SEK (kr)</option>
                    <option value="NOK">NOK (kr)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
                
                <div className="h-px ml-20 my-1.5" style={{ background: 'var(--border-default)', height: '1px' }}></div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors gap-4" style={{ border: '1px solid transparent' }}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Palette className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Appearance</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Light, Dark, or System mode</span>
                    </div>
                  </div>
                  <button className="flex items-center justify-between gap-3 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:border-orange-300 transition-colors w-full sm:w-auto" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', color: 'var(--foreground-primary)' }}>
                    <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-slate-700"></div> System</div>
                    <ChevronDown className="w-5 h-5" style={{ color: 'var(--foreground-secondary)' }} />
                  </button>
                </div>

                <div className="h-px ml-20 my-1.5" style={{ background: 'var(--border-default)', height: '1px' }}></div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors gap-4" style={{ border: '1px solid transparent' }}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><Globe className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Language</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Interface language</span>
                    </div>
                  </div>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className="px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:border-blue-300 transition-colors appearance-none cursor-pointer outline-none w-full sm:w-auto" style={{ background: 'var(--background-elevated)', borderColor: 'var(--border-default)', color: 'var(--foreground-primary)' }}>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ar">العربية</option>
                    <option value="pt">Português</option>
                    <option value="hi">हिन्दी</option>
                    <option value="ru">Русский</option>
                    <option value="it">Italiano</option>
                    <option value="ko">한국어</option>
                    <option value="tr">Türkçe</option>
                    <option value="nl">Nederlands</option>
                    <option value="pl">Polski</option>
                    <option value="vi">Tiếng Việt</option>
                    <option value="th">ไทย</option>
                    <option value="id">Bahasa Indonesia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="panel flex flex-col">
              <h3 className="section-title" style={{ fontSize: '1.5rem' }}>Notifications</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group" style={{ border: '1px solid transparent' }} onClick={() => setPushNotifs(!pushNotifs)}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><Smartphone className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Push Notifications</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Get notified for incoming payments</span>
                    </div>
                  </div>
                  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${pushNotifs ? 'bg-indigo-600' : ''}`} style={{ background: !pushNotifs ? 'var(--border-default)' : undefined }}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${pushNotifs ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
                  </div>
                </div>
                
                <div className="h-px ml-20 my-1.5" style={{ background: 'var(--border-default)', height: '1px' }}></div>

                <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group" style={{ border: '1px solid transparent' }} onClick={() => setEmailNotifs(!emailNotifs)}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><Mail className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Email Summaries</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Weekly wallet activity reports</span>
                    </div>
                  </div>
                  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${emailNotifs ? 'bg-indigo-600' : ''}`} style={{ background: !emailNotifs ? 'var(--border-default)' : undefined }}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${emailNotifs ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
                  </div>
                </div>

                <div className="h-px ml-20 my-1.5" style={{ background: 'var(--border-default)', height: '1px' }}></div>

                <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group" style={{ border: '1px solid transparent' }} onClick={() => setTxConfirm(!txConfirm)}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}><CheckCircle2 className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Transaction Confirmation</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Require review before signing</span>
                    </div>
                  </div>
                  <div className={`w-12 h-[26px] rounded-full flex items-center p-1 transition-colors duration-300 shadow-inner ${txConfirm ? 'bg-indigo-600' : ''}`} style={{ background: !txConfirm ? 'var(--border-default)' : undefined }}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ${txConfirm ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Atreus Card */}
            <div className="panel flex flex-col">
              <h3 className="section-title" style={{ fontSize: '1.5rem' }}>About Atreus</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group" style={{ border: '1px solid transparent' }}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ color: 'var(--foreground-secondary)' }}><Info className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Version</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Atreus Wallet Web 1.0.0</span>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'var(--background-elevated)', color: 'var(--foreground-secondary)' }}>Up to date</span>
                </div>
                
                <div className="h-px ml-20 my-1.5" style={{ background: 'var(--border-default)', height: '1px' }}></div>

                <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group" style={{ border: '1px solid transparent' }}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)' }}><FileText className="w-6 h-6"/></div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base" style={{ color: 'var(--foreground-primary)' }}>Terms of Service</span>
                      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground-secondary)' }}>Read our terms and conditions</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 transition-colors" style={{ color: 'var(--foreground-secondary)' }}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
