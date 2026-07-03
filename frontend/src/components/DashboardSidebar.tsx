"use client";

import Image from "next/image";
import Link from "next/link";
import { Shield, ChevronDown, ArrowRightLeft } from "lucide-react";
import logo from "../media/ateruslogo.jpeg";

interface NavItem {
  icon: any;
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

interface DashboardSidebarProps {
  navItems: NavItem[];
  emailName: string;
  displayAddress: string;
}

export default function DashboardSidebar({ navItems, emailName, displayAddress }: DashboardSidebarProps) {
  return (
    <aside className="w-[280px] bg-white border-r border-slate-100 hidden lg:flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-20 overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-8 pb-4 shrink-0">
        <Link href="/" className="flex items-center gap-3 px-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Image src={logo} alt="Atreus" width={32} height={32} className="rounded-[10px] shadow-sm" />
          <span className="font-extrabold text-xl tracking-tight text-slate-900">Atreus</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-1.5 py-2">
        {navItems.map((item, i) => {
          if (item.href) {
            return (
              <Link key={i} href={item.href} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          }
          return (
            <div key={i} onClick={item.onClick} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm cursor-pointer ${item.active ? 'bg-indigo-50/80 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
              <item.icon className={`w-5 h-5 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.label}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-6 pb-6 pt-3 shrink-0 flex flex-col gap-3">
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Built on Stellar</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse ml-auto"></div>
          </div>
          <p className="text-[12px] font-medium text-slate-500 leading-snug">Fast. Low cost. Borderless payments.</p>
          <button className="text-[12px] font-bold text-blue-600 hover:text-blue-700 mt-2 flex items-center gap-1">Learn more <ArrowRightLeft className="w-3 h-3" /></button>
        </div>

        <Link href="/profile" className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
              {emailName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate">{emailName}</span>
              <span className="text-[10px] font-medium text-slate-500 truncate">{displayAddress}</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
