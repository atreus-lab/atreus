"use client";

import { Search, Bell, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AppHeaderProps {
  title: string;
  subtitle: string;
  onSearchOpen?: () => void;
  onBellClick?: () => void;
  unreadCount?: number;
  /** Optional back button href (e.g. /dashboard) */
  backHref?: string;
  /** Override the default right-side content */
  rightContent?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, onSearchOpen, onBellClick, unreadCount, backHref, rightContent }: AppHeaderProps) {
  return (
    <header className="relative w-full flex items-center justify-between py-6 px-8 sm:px-10 lg:px-12 bg-[#FAFBFF] sticky top-0 z-30 backdrop-blur-md border-b border-slate-100/50">
      <div className="flex flex-col">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          {backHref && (
            <Link href={backHref} className="text-slate-400 hover:text-indigo-600 transition-colors p-1 -ml-1 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          {title}
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>
      </div>
      {rightContent || (
        <div className="hidden md:flex items-center gap-6">
          {onSearchOpen && (
            <button onClick={onSearchOpen} className="flex items-center gap-3 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium hover:border-blue-300 transition-all w-64 shadow-sm group">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Search anything...</span>
              <div className="ml-auto flex items-center gap-1">
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">⌘</span>
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-bold">K</span>
              </div>
            </button>
          )}
          {onBellClick && (
            <button data-bell onClick={onBellClick} className="relative p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm">
              <Bell className="w-5 h-5 text-slate-600" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4">{unreadCount}</span>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
