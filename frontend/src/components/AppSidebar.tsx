"use client";

import { type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Shield, ChevronDown, ArrowRightLeft } from "lucide-react";
import logo from "../media/ateruslogo.jpeg";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

interface AppSidebarProps {
  navItems: NavItem[];
  emailName: string;
  displayAddress: string;
}

export default function AppSidebar({ navItems, emailName, displayAddress }: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar">
        <div className="sidebar-header">
          <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <Image src={logo} alt="Atreus" width={32} height={32} className="rounded-[10px] shadow-sm" />
            <span className="font-extrabold text-xl tracking-tight" style={{ color: 'var(--foreground-primary)' }}>Atreus</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            const cls = item.active ? 'sidebar-item-active' : 'sidebar-item';
            if (item.href) {
              return (
                <Link key={i} href={item.href} className={cls}>
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            }
            return (
              <div key={i} onClick={item.onClick} className={cls}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer flex flex-col gap-3">
          <div className="surface p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="icon-sm" style={{ color: 'var(--foreground-secondary)' }} />
              <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--foreground-secondary)' }}>Built on Stellar</span>
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
            </div>
            <p className="text-[12px] font-medium leading-snug" style={{ color: 'var(--foreground-secondary)' }}>Fast. Low cost. Borderless payments.</p>
            <button className="text-[12px] font-bold mt-2 flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>Learn more <ArrowRightLeft className="w-3 h-3" /></button>
          </div>
          <Link href="/profile" className="flex items-center justify-between p-3 surface-hover rounded-2xl group" style={{ border: '1px solid var(--border-default)' }}>
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
          </Link>
        </div>
      </div>
    </aside>
  );
}
