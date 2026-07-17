"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWallet, getBalances, getTransactions, type StoredWallet } from "@/lib/wallet";
import { getClaimedLinks } from "@/lib/links";
import { CheckCircle2, Edit2, ShieldCheck, Lock, Fingerprint, KeyRound, Shield, ChevronRight, Copy, Bell, Palette, Globe, Download, ChevronDown, Trash2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchDialog from "@/components/SearchDialog";

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBio, setCustomBio] = useState("");

  const DISPLAY_NAME_KEY = 'atreus_display_name';
  const BIO_KEY = 'atreus_bio';

  useEffect(() => {
    const wallet = loadWallet();
    if (!wallet) { router.push("/wallet"); return; }
    setStoredWallet(wallet);
    setAddress(wallet.publicKey);
    setCustomName(localStorage.getItem(DISPLAY_NAME_KEY) || '');
    setCustomBio(localStorage.getItem(BIO_KEY) || '');
    setLoading(false);
  }, [router]);

  const savedName = customName || (storedWallet?.email ? storedWallet.email.split('@')[0] : 'User');
  const displayName = savedName.charAt(0).toUpperCase() + savedName.slice(1);
  const displayBio = customBio || 'Exploring the future of payments with Atreus 🚀';

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
      // Include senders of payment links this wallet has claimed — these funds move
      // via the claim contract, not a Horizon payment, so they're invisible above.
      const claimedLinks = getClaimedLinks();
      for (const link of claimedLinks) {
        const counterparty = link.counterpartyAddress;
        if (!counterparty || counterparty === pk) continue;
        const amount = parseFloat(link.amount) || 0;
        const seenAt = new Date(link.createdAt).toISOString();
        if (!counterparties[counterparty]) counterparties[counterparty] = { received: 0, sent: 0, txs: 0, firstSeen: seenAt, lastSeen: seenAt };
        counterparties[counterparty].received += amount;
        counterparties[counterparty].txs += 1;
        totalReceived += amount;
        if (seenAt < counterparties[counterparty].firstSeen) counterparties[counterparty].firstSeen = seenAt;
        if (seenAt > counterparties[counterparty].lastSeen) counterparties[counterparty].lastSeen = seenAt;
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
      if (transactions.length > 0) { for (const tx of transactions) { const date = new Date(tx.created_at).toLocaleDateString(); const amount = (parseFloat(tx.amount) || 0).toFixed(4); const asset = tx.asset_code || 'XLM'; const counterparty = tx.from === pk ? tx.to : tx.from; const cs = counterparty || '(unknown)'; const dir = tx.to === pk ? '← Received from' : '→ Sent to'; report += `  ${date.padEnd(14)} ${(tx.type || 'payment').padEnd(16)} ${amount.padEnd(16)} ${asset.padEnd(10)}  ${dir} ${cs}\n`; } }
      else { report += `  No transactions found.\n`; }
      report += `\n${sep}\n  End of report\n${sep}\n`;
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `atreus-account-${pk.slice(0, 8)}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed:', err); alert('Failed to export account data.'); }
    finally { setExporting(false); }
  };

  const handleEditProfile = () => {
    if (editingProfile) {
      // Save
      localStorage.setItem(DISPLAY_NAME_KEY, customName);
      localStorage.setItem(BIO_KEY, customBio);
    }
    setEditingProfile(!editingProfile);
  };

  const SECURITY_ITEMS = [
    { icon: ShieldCheck, color: 'var(--accent-primary)', title: 'Recovery Phrase', desc: 'Secure your wallet recovery phrase', badge: <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[rgba(34,197,94,0.08)] text-success">Backed up</span> },
    { icon: Lock, color: 'var(--accent-primary)', title: 'Password', desc: 'Manage your account password' },
    { icon: Fingerprint, color: '#a855f7', title: 'Biometric Login', desc: 'Use biometrics to secure your account', badge: <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[rgba(34,197,94,0.08)] text-success">Enabled</span> },
    { icon: KeyRound, color: 'var(--accent-primary)', title: 'Passkeys', desc: 'Manage your passkeys', badge: <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-secondary">Coming Soon</span> },
    { icon: Shield, color: 'var(--foreground-secondary)', title: 'Two-Factor Authentication', desc: 'Add an extra layer of security', badge: <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-secondary">Disabled</span> },
  ];

  return (
    <>
      <AppHeader title="Profile" subtitle="Manage your account and wallet preferences" backHref="/dashboard" onSearchOpen={() => setSearchOpen(true)} />
      <div className="app-content">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* Profile Card */}
            <div className="panel p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-2xl">{displayName.charAt(0)}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-lg font-bold text-primary truncate">{displayName}</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[rgba(59,130,246,0.08)] text-accent flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                    </div>
                    <p className="text-xs text-secondary truncate">{storedWallet?.email}</p>
                    <p className="text-[10px] text-secondary mt-0.5">Member since July 2, 2026</p>
                  </div>
                </div>
                <button onClick={handleEditProfile} className="px-3 py-1.5 bg-[rgba(59,130,246,0.08)] text-accent text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors hover:bg-[rgba(59,130,246,0.12)]">
                  {editingProfile ? <><CheckCircle2 className="w-3 h-3" /> Save</> : <><Edit2 className="w-3 h-3" /> Edit</>}
                </button>
              </div>
              {editingProfile ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-secondary mb-1 block">Display Name</label>
                    <input
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-elevated border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm font-semibold text-primary outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-secondary mb-1 block">Bio</label>
                    <input
                      value={customBio}
                      onChange={e => setCustomBio(e.target.value)}
                      placeholder="Tell us about yourself"
                      className="w-full bg-elevated border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm font-semibold text-primary outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-primary">{displayBio}</p>
              )}
            </div>

            {/* Security Card */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">Security</h3>
              <div className="flex flex-col gap-1">
                {SECURITY_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}15`, color: item.color }}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-primary">{item.title}</span>
                        <span className="text-[10px] text-secondary">{item.desc}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge}
                      <ChevronRight className="w-4 h-4 text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-1">Connected Accounts</h3>
              <p className="text-xs text-secondary mb-4">Manage your connected accounts and integrations</p>
              <div className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-2">
                    <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-primary">Google</span>
                    <span className="text-[10px] text-secondary">{storedWallet?.email}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[rgba(34,197,94,0.08)] text-success">Connected</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Wallet Overview */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">Wallet Overview</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="section-label">Wallet Address</span>
                  <button className="flex items-center gap-2 p-3 rounded-lg bg-elevated border border-[var(--border-default)] cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.06)]" onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    <span className="font-mono text-sm font-bold text-primary truncate">{address.slice(0, 12)}...{address.slice(-6)}</span>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <Copy className="w-4 h-4 text-secondary shrink-0" />}
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="section-label">Network</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${defaultNetwork === 'testnet' ? 'bg-emerald-500' : 'bg-amber-500'} shrink-0`} />
                    <span className="text-sm font-bold text-primary">{defaultNetwork === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="section-label">Account Type</span>
                  <span className="text-sm font-bold text-primary">Standard Wallet</span>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">Preferences</h3>
              <div className="flex flex-col gap-1">
                {[
                  { icon: <span className="font-bold text-sm">$</span>, color: 'var(--accent-primary)', title: 'Currency', desc: 'Choose your preferred currency', control: <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-elevated border border-[var(--border-default)] px-3 py-1.5 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer"><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="JPY">JPY (¥)</option><option value="INR">INR (₹)</option></select> },
                  { icon: <Palette className="w-4 h-4" />, color: '#a855f7', title: 'Theme', desc: 'Choose your preferred theme', control: <span className="text-xs font-bold text-secondary">Dark</span> },
                  { icon: <Bell className="w-4 h-4" />, color: 'var(--accent-primary)', title: 'Notifications', desc: 'Manage notifications' },
                  { icon: <Globe className="w-4 h-4" />, color: 'var(--accent-primary)', title: 'Language', desc: 'Choose your language', control: <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-elevated border border-[var(--border-default)] px-3 py-1.5 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="hi">हिन्दी</option></select> },
                  { icon: <span className="font-bold text-sm">⊞</span>, color: 'var(--foreground-secondary)', title: 'Default Network', desc: 'Select network', control: <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${defaultNetwork === 'testnet' ? 'bg-emerald-500' : 'bg-amber-500'}`} /><select value={defaultNetwork} onChange={e => setDefaultNetwork(e.target.value)} className="bg-elevated border border-[var(--border-default)] px-3 py-1.5 rounded-lg text-xs font-bold text-primary outline-none cursor-pointer"><option value="testnet">Testnet</option><option value="mainnet">Mainnet</option></select></div> },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}15`, color: item.color }}>{item.icon}</div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-primary">{item.title}</span>
                        <span className="text-[10px] text-secondary">{item.desc}</span>
                      </div>
                    </div>
                    {item.control || <ChevronRight className="w-4 h-4 text-secondary" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Account Actions */}
            <div className="panel p-6">
              <h3 className="text-base font-bold text-primary mb-4">Account Actions</h3>
              <div className="flex flex-col gap-3">
                <button onClick={handleExport} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(59,130,246,0.04)] border border-[rgba(59,130,246,0.08)] transition-colors hover:bg-[rgba(59,130,246,0.08)] cursor-pointer w-full text-left">
                  <div className="flex items-center gap-3">
                    <Download className={`w-4 h-4 text-accent ${exporting ? 'animate-bounce' : ''}`} />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-primary">{exporting ? 'Exporting...' : 'Export Account Data'}</span>
                      <span className="text-[10px] text-secondary">{exporting ? 'Gathering your data...' : 'Download your account data'}</span>
                    </div>
                  </div>
                  {exporting ? <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" /> : <ChevronRight className="w-4 h-4 text-secondary" />}
                </button>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(248,113,113,0.04)] border border-[rgba(248,113,113,0.08)] transition-colors hover:bg-[rgba(248,113,113,0.08)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-error" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-error">Delete Account</span>
                      <span className="text-[10px] text-secondary">Permanently delete your account and all data</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-secondary" />
                </div>
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
