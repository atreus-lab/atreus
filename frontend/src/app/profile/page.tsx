"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, getBalances, getTransactions, type StoredWallet } from "@/lib/wallet";
import { CheckCircle2, Edit2, ShieldCheck, Lock, Fingerprint, KeyRound, Shield, ChevronRight, Copy, Bell, Palette, Globe, Download, ChevronDown, Trash2, Info, Settings as SettingsIcon } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";
import { getNavItems } from "@/constants/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [defaultNetwork, setDefaultNetwork] = useState("testnet");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [exporting, setExporting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    setAddress(wallet.publicKey);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleExport = async () => {
    if (!storedWallet) return;
    setExporting(true);
    try {
      const balances = await getBalances(storedWallet.publicKey);
      const transactions = await getTransactions(storedWallet.publicKey, 50);
      const pk = storedWallet.publicKey;
      const netLabel = defaultNetwork === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet';
      const now = new Date().toLocaleString();
      const counterparties: Record<string, { received: number; sent: number; txs: number; firstSeen: string; lastSeen: string }> = {};
      let totalReceived = 0, totalSent = 0;
      for (const tx of transactions) {
        const counterparty = tx.from === pk ? tx.to : tx.from;
        if (!counterparty || counterparty === pk) continue;
        if (!counterparties[counterparty]) counterparties[counterparty] = { received: 0, sent: 0, txs: 0, firstSeen: tx.created_at, lastSeen: tx.created_at };
        const amount = parseFloat(tx.amount) || 0;
        if (tx.to === pk) { counterparties[counterparty].received += amount; totalReceived += amount; }
        else if (tx.from === pk) { counterparties[counterparty].sent += amount; totalSent += amount; }
        counterparties[counterparty].txs += 1;
        if (tx.created_at < counterparties[counterparty].firstSeen) counterparties[counterparty].firstSeen = tx.created_at;
        if (tx.created_at > counterparties[counterparty].lastSeen) counterparties[counterparty].lastSeen = tx.created_at;
      }
      const sep = '═'.repeat(72);
      let report = `\n${sep}\n  ATREUS ACCOUNT REPORT\n${sep}\n\nGenerated: ${now}\nNetwork:   ${netLabel}\n\n── Account ──────────────────────────────────────────────────────\n  Public Key:  ${pk}\n  Email:       ${storedWallet.email || 'N/A'}\n  Explorer:    https://stellar.expert/explorer/${defaultNetwork === 'testnet' ? 'testnet' : 'public'}/account/${pk}\n`;
      const xlmBal = balances?.find((b: any) => b.asset_type === 'native')?.balance || '0';
      report += `── Summary ──────────────────────────────────────────────────────\n  Total XLM Balance:  ${parseFloat(xlmBal).toLocaleString()}\n  Total Transactions: ${transactions.length}\n  Total Counterparties: ${Object.keys(counterparties).length}\n`;
      if (totalReceived > 0 || totalSent > 0) report += `  Total Received:     ${totalReceived.toFixed(2)} XLM\n  Total Sent:         ${totalSent.toFixed(2)} XLM\n`;
      report += `\n── Balances ────────────────────────────────────────────────────\n`;
      if (balances && balances.length > 0) { for (const b of balances) { const assetName = b.asset_type === 'native' ? 'XLM' : (b.asset_code || b.asset_type); const amt = parseFloat(b.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 }); report += `  ${assetName.padEnd(10)} ${amt}\n`; } }
      else { report += `  No balances found.\n`; }
      report += `\n── Activity by Counterparty ────────────────────────────────────\n`;
      const sorted = Object.entries(counterparties).sort((a, b) => b[1].txs - a[1].txs);
      if (sorted.length > 0) { for (const [addr, info] of sorted) { const shortAddr = `${addr.slice(0, 8)}...${addr.slice(-6)}`; report += `  ${shortAddr.padEnd(40)} ${info.received.toFixed(2).padEnd(12)} ${info.sent.toFixed(2).padEnd(12)} ${String(info.txs).padEnd(6)}  ${new Date(info.lastSeen).toLocaleDateString()}\n`; } }
      else { report += `  No transactions yet.\n`; }
      report += `\n── Transaction History ────────────────────────────────────────\n`;
      if (transactions.length > 0) { for (const tx of transactions) { const date = new Date(tx.created_at).toLocaleDateString(); const amount = (parseFloat(tx.amount) || 0).toFixed(4); const asset = tx.asset_code || 'XLM'; const counterparty = tx.from === pk ? tx.to : tx.from; const cs = counterparty ? `${counterparty.slice(0, 8)}...${counterparty.slice(-6)}` : '(unknown)'; const dir = tx.to === pk ? '← Received from' : '→ Sent to'; report += `  ${date.padEnd(14)} ${(tx.type || 'payment').padEnd(16)} ${amount.padEnd(16)} ${asset.padEnd(10)}  ${dir} ${cs}\n`; } }
      else { report += `  No transactions found.\n`; }
      report += `\n${sep}\n  End of report\n${sep}\n`;
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `atreus-account-${pk.slice(0, 8)}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed:', err); alert('Failed to export account data.'); }
    finally { setExporting(false); }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  const emailName = storedWallet?.email ? storedWallet.email.split('@')[0] : 'User';
  const displayAddress = address ? `${address.slice(0, 5)}...${address.slice(-4)}` : '';
  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex font-sans text-slate-900 selection:bg-indigo-100">
      <AppSidebar navItems={navItems} emailName={emailName} displayAddress={displayAddress} />
      <main className="flex-1 flex flex-col min-w-0">
        <AppHeader title="Profile" subtitle="Manage your account and wallet preferences" onSearchOpen={() => setSearchOpen(true)} />
        <div className="px-8 sm:px-10 lg:px-12 py-8 flex-1 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="flex flex-col gap-8">
              {/* Profile Info Card */}
              <div className="bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0 border-4 border-white">
                      <span className="text-white font-extrabold text-4xl">{emailName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h2 className="text-2xl font-extrabold text-slate-900">{emailName.charAt(0).toUpperCase() + emailName.slice(1)}</h2>
                        <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-100"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">{storedWallet?.email}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">Member since July 2, 2026</p>
                    </div>
                  </div>
                  <button className="shrink-0 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap"><Edit2 className="w-3.5 h-3.5" /> Edit Profile</button>
                </div>
                <p className="text-sm font-bold text-slate-700">Exploring the future of payments with Atreus 🚀</p>
              </div>

              {/* Security Card */}
              <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
                <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Security</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { icon: <ShieldCheck className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-500', title: 'Recovery Phrase', desc: 'Secure your wallet recovery phrase', right: <span className="bg-green-50 text-green-600 border border-green-100 px-3 py-1.5 rounded-xl text-xs font-bold">Backed up</span> },
                    { icon: <Lock className="w-6 h-6" />, color: 'bg-blue-50 text-blue-500', title: 'Password', desc: 'Manage your account password' },
                    { icon: <Fingerprint className="w-6 h-6" />, color: 'bg-purple-50 text-purple-500', title: 'Biometric Login', desc: 'Use biometrics to secure your account', right: <span className="bg-green-50 text-green-600 border border-green-100 px-3 py-1.5 rounded-xl text-xs font-bold">Enabled</span> },
                    { icon: <KeyRound className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-500', title: 'Passkeys', desc: 'Manage your passkeys', right: <span className="text-indigo-600 px-3 py-1.5 text-xs font-bold">Coming Soon</span> },
                    { icon: <Shield className="w-6 h-6" />, color: 'bg-slate-100 text-slate-500', title: 'Two-Factor Authentication', desc: 'Add an extra layer of security', right: <span className="text-slate-400 px-3 py-1.5 text-xs font-bold">Disabled</span> },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>{item.icon}</div>
                          <div className="flex flex-col"><span className="font-bold text-slate-900 text-base">{item.title}</span><span className="text-xs font-semibold text-slate-500 mt-0.5">{item.desc}</span></div>
                        </div>
                        <div className="flex items-center gap-4">
                          {item.right}
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </div>
                      </div>
                      {i < 4 && <div className="h-px bg-slate-100 ml-20 my-1.5"></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
                <h3 className="font-extrabold text-slate-900 mb-2 text-2xl">Connected Accounts</h3>
                <p className="text-sm font-semibold text-slate-500 mb-8">Manage your connected accounts and integrations</p>
                <div className="flex items-center justify-between p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center p-3">
                      <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    </div>
                    <div className="flex flex-col"><span className="font-bold text-slate-900 text-base">Google</span><span className="text-xs font-semibold text-slate-500">{storedWallet?.email}</span></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-green-50 text-green-600 border border-green-100 px-4 py-1.5 rounded-xl text-xs font-bold">Connected</span>
                    <button className="text-slate-400 hover:text-slate-600"><SettingsIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-8">
              {/* Wallet Overview */}
              <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
                <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Wallet Overview</h3>
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2.5 items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wallet Address</span>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                      <span className="text-base font-mono font-bold text-slate-800 tracking-tight">{address.slice(0, 12)}...{address.slice(-6)}</span>
                      {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Network</span>
                    <div className="flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${defaultNetwork === 'testnet' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500'} shrink-0`}></div><span className="text-base font-bold text-slate-700">{defaultNetwork === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet'}</span></div>
                  </div>
                  <div className="flex flex-col gap-2.5 items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Type</span>
                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl border border-indigo-100"><span className="text-sm font-bold">Standard Wallet</span><Info className="w-4 h-4 opacity-80" /></div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
                <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Preferences</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
                    <div className="flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"><span className="font-bold text-lg">$</span></div><div className="flex flex-col"><span className="font-bold text-slate-900 text-base">Currency Display</span><span className="text-xs font-semibold text-slate-500 mt-0.5">Choose your preferred currency</span></div></div>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors appearance-none cursor-pointer outline-none w-full sm:w-auto">
                      <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="JPY">JPY (¥)</option><option value="CNY">CNY (¥)</option><option value="INR">INR (₹)</option><option value="NGN">NGN (₦)</option><option value="KRW">KRW (₩)</option><option value="BRL">BRL (R$)</option><option value="AUD">AUD (A$)</option><option value="CAD">CAD (C$)</option><option value="CHF">CHF (Fr)</option><option value="RUB">RUB (₽)</option><option value="MXN">MXN (Mex$)</option><option value="ZAR">ZAR (R)</option><option value="SGD">SGD (S$)</option><option value="HKD">HKD (HK$)</option><option value="SEK">SEK (kr)</option><option value="NOK">NOK (kr)</option><option value="AED">AED (د.إ)</option>
                    </select>
                  </div>
                  <div className="h-px bg-slate-100 ml-20 my-1.5"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
                    <div className="flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><Palette className="w-6 h-6" /></div><div className="flex flex-col"><span className="font-bold text-slate-900 text-base">Theme</span><span className="text-xs font-semibold text-slate-500 mt-0.5">Choose your preferred theme</span></div></div>
                    <button className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors w-full sm:w-auto"><div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border-2 border-slate-700"></div> Light</div><ChevronDown className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="h-px bg-slate-100 ml-20 my-1.5"></div>
                  <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><Bell className="w-6 h-6" /></div><div className="flex flex-col"><span className="font-bold text-slate-900 text-base">Notifications</span><span className="text-xs font-semibold text-slate-500 mt-0.5">Manage your notification settings</span></div></div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                  <div className="h-px bg-slate-100 ml-20 my-1.5"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
                    <div className="flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Globe className="w-6 h-6" /></div><div className="flex flex-col"><span className="font-bold text-slate-900 text-base">Language</span><span className="text-xs font-semibold text-slate-500 mt-0.5">Choose your preferred language</span></div></div>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors appearance-none cursor-pointer outline-none w-full sm:w-auto">
                      <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="zh">中文</option><option value="ja">日本語</option><option value="ar">العربية</option><option value="pt">Português</option><option value="hi">हिन्दी</option><option value="ru">Русский</option><option value="it">Italiano</option><option value="ko">한국어</option><option value="tr">Türkçe</option><option value="nl">Nederlands</option><option value="pl">Polski</option><option value="vi">Tiếng Việt</option><option value="th">ไทย</option><option value="id">Bahasa Indonesia</option>
                    </select>
                  </div>
                  <div className="h-px bg-slate-100 ml-20 my-1.5"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 gap-4">
                    <div className="flex items-center gap-5"><div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><span className="font-bold">⊞</span></div><div className="flex flex-col"><span className="font-bold text-slate-900 text-base">Default Network</span><span className="text-xs font-semibold text-slate-500 mt-0.5">Select default network</span></div></div>
                    <div className="flex items-center gap-3 w-full sm:w-auto"><div className={`w-2.5 h-2.5 rounded-full ${defaultNetwork === 'testnet' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500'} shrink-0`}></div>
                    <select value={defaultNetwork} onChange={e => setDefaultNetwork(e.target.value)} className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 transition-colors appearance-none cursor-pointer outline-none"><option value="testnet">Stellar Testnet</option><option value="mainnet">Stellar Mainnet</option></select></div>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="bg-white rounded-[2rem] p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col">
                <h3 className="font-extrabold text-slate-900 mb-8 text-2xl">Account Actions</h3>
                <div className="flex flex-col gap-5">
                  <button onClick={handleExport} className="flex items-center justify-between p-5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-2xl transition-colors cursor-pointer group w-full text-left">
                    <div className="flex items-center gap-5"><Download className={`w-6 h-6 text-indigo-500 ${exporting ? 'animate-bounce' : 'group-hover:-translate-y-0.5'} transition-transform`}/><div className="flex flex-col"><span className="font-bold text-indigo-900 text-base">{exporting ? 'Exporting...' : 'Export Account Data'}</span><span className="text-xs font-semibold text-indigo-500 mt-0.5">{exporting ? 'Gathering your data...' : 'Download your account data'}</span></div></div>
                    {exporting ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />}
                  </button>
                  <div className="flex items-center justify-between p-5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl transition-colors cursor-pointer group">
                    <div className="flex items-center gap-5"><Trash2 className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform"/><div className="flex flex-col"><span className="font-bold text-red-700 text-base">Delete Account</span><span className="text-xs font-semibold text-red-500 mt-0.5">Permanently delete your account and all data</span></div></div>
                    <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-red-600 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} links={[]} receivedLinks={[]} transactions={[]} address="" />
      </main>
    </div>
  );
}
