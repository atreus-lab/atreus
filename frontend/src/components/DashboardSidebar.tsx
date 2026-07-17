"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronUp, LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, Settings, User } from "lucide-react";
import logo from "../media/ateruslogo.jpeg";
import { useSidebar } from "./sidebar-context";
import { loadWallet } from "@/lib/wallet";
import { SharedLayoutBg } from "./motion/shared-layout-bg";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Link2, label: "Payment Links", href: "/payment-links" },
  { icon: ArrowRightLeft, label: "Swap", href: "/swap" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Activity, label: "Activity", href: "/activity" },
  { icon: Shield, label: "Security", href: "/security" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: User, label: "Profile", href: "/profile" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, setProfileOpen } = useSidebar();
  const wallet = loadWallet();
  const emailName = wallet?.email ? wallet.email.split('@')[0] : 'User';
  const displayAddress = wallet?.publicKey ? `${wallet.publicKey.slice(0, 5)}...${wallet.publicKey.slice(-4)}` : '';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  if (collapsed) {
    return (
      <aside className="app-sidebar collapsed">
        <div className="sidebar">
          <div className="sidebar-header flex items-center justify-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image src={logo} alt="Atreus" width={24} height={24} className="rounded-lg shrink-0" />
            </Link>
          </div>
          <button onClick={toggleCollapsed} className="btn btn-icon btn-ghost mx-auto mb-4" style={{ borderRadius: '0.5rem' }}>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? 'sidebar-item-active' : 'sidebar-item'} title={item.label}>
                <item.icon className="w-[18px] h-[18px] shrink-0" />
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    );
  }

  return (
    <aside className="app-sidebar">
      <div className="sidebar">
        <div className="sidebar-header flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <Image src={logo} alt="Atreus" width={28} height={28} className="rounded-lg shrink-0" />
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-lg tracking-tight text-primary truncate">Atreus</span>
              <span className="env-badge">Testnet</span>
            </span>
          </Link>
          <button onClick={toggleCollapsed} className="btn btn-icon btn-ghost shrink-0" style={{ borderRadius: '0.5rem' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <nav className="sidebar-nav" style={{ overflow: 'hidden' }}>
          <SharedLayoutBg pillClassName="bg-primary/[0.06]" inset={8}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? 'sidebar-item-active' : 'sidebar-item'}>
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </SharedLayoutBg>
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => setProfileOpen(true)} className="flex items-center justify-between p-2.5 rounded-xl w-full text-left transition-colors hover:bg-[var(--background-elevated)]" style={{ border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-[var(--accent-primary)] text-white">
                {emailName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-primary truncate">{emailName}</span>
                <span className="text-[10px] text-secondary truncate">{displayAddress}</span>
              </div>
            </div>
            <ChevronUp className="w-3.5 h-3.5 shrink-0 text-secondary" />
          </button>
        </div>
      </div>
    </aside>
  );
}
