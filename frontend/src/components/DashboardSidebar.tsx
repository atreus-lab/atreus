"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronUp, LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, Settings } from "lucide-react";
import logo from "../media/ateruslogo.jpeg";
import { useSidebar } from "./sidebar-context";
import { loadWallet } from "@/lib/wallet";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Link2, label: "Payment Links", href: "/payment-links" },
  { icon: ArrowRightLeft, label: "Swap", href: "/swap" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Activity, label: "Activity", href: "/activity" },
  { icon: Shield, label: "Security", href: "/security" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, setProfileOpen } = useSidebar();
  const wallet = loadWallet();
  const emailName = wallet?.email ? wallet.email.split('@')[0] : 'User';
  const displayAddress = wallet?.publicKey ? `${wallet.publicKey.slice(0, 5)}...${wallet.publicKey.slice(-4)}` : '';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar">
        {/* Logo + Toggle */}
        <div className="sidebar-header flex items-center justify-between">
          <Link href="/" className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${collapsed ? 'justify-center w-full' : ''}`}>
            <Image src={logo} alt="Atreus" width={collapsed ? 24 : 28} height={collapsed ? 24 : 28} className="rounded-lg shrink-0" />
            {!collapsed && <span className="font-extrabold text-lg tracking-tight text-primary">Atreus</span>}
          </Link>
          {!collapsed && (
            <button onClick={toggleCollapsed} className="btn btn-icon btn-ghost shrink-0" style={{ borderRadius: '0.5rem' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button onClick={toggleCollapsed} className="btn btn-icon btn-ghost mx-auto mb-4" style={{ borderRadius: '0.5rem' }}>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? 'sidebar-item-active' : 'sidebar-item'} title={collapsed ? item.label : undefined}>
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        {!collapsed && (
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
        )}
      </div>
    </aside>
  );
}
