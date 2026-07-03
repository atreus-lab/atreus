"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ChevronDown, ChevronLeft, LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Settings } from "lucide-react";
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
            <Image src={logo} alt="Atreus" width={collapsed ? 28 : 32} height={collapsed ? 28 : 32} className="rounded-[10px] shadow-sm shrink-0" />
            {!collapsed && <span className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--foreground-primary)' }}>Atreus</span>}
          </Link>
          {!collapsed && (
            <button onClick={toggleCollapsed} className="btn-icon btn-ghost shrink-0" style={{ borderRadius: '0.5rem' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button onClick={toggleCollapsed} className="btn-icon btn-ghost mx-auto mb-4" style={{ borderRadius: '0.5rem' }}>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? 'sidebar-item-active' : 'sidebar-item'} title={collapsed ? item.label : undefined}>
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        {!collapsed && (
          <div className="sidebar-footer flex flex-col gap-3">
            <div className="surface p-4 hidden lg:block">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="icon-sm" style={{ color: 'var(--foreground-secondary)' }} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>Built on Stellar</span>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
              </div>
              <p className="text-[12px] font-medium leading-snug" style={{ color: 'var(--foreground-secondary)' }}>Fast. Low cost. Borderless payments.</p>
            </div>

            <button onClick={() => setProfileOpen(true)} className="flex items-center justify-between p-3 surface-hover rounded-2xl w-full text-left" style={{ border: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm shrink-0" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                  {emailName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate" style={{ color: 'var(--foreground-primary)' }}>{emailName}</span>
                  <span className="text-[10px] font-medium truncate" style={{ color: 'var(--foreground-secondary)' }}>{displayAddress}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--foreground-secondary)' }} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
