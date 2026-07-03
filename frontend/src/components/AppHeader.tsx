"use client";

import { Search, Bell, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AppHeaderProps {
  title: string;
  subtitle: string;
  onSearchOpen?: () => void;
  onBellClick?: () => void;
  unreadCount?: number;
  backHref?: string;
  rightContent?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, onSearchOpen, onBellClick, unreadCount, backHref, rightContent }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="flex flex-col">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight flex items-center gap-2 text-primary">
          {backHref && (
            <Link href={backHref} className="btn btn-icon btn-ghost -ml-1" style={{ borderRadius: '0.5rem' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          {title}
        </h1>
        <p className="text-sm font-medium mt-0.5 text-secondary">{subtitle}</p>
      </div>
      {rightContent || (
        <div className="hidden md:flex items-center gap-4">
          {onSearchOpen && (
            <button onClick={onSearchOpen} className="header-search-trigger w-64">
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1 text-left">Search anything...</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="kbd">⌘</span>
                <span className="kbd">K</span>
              </div>
            </button>
          )}
          {onBellClick && (
            <button data-bell onClick={onBellClick} className="btn btn-icon btn-ghost relative" style={{ borderRadius: '9999px', border: '1px solid var(--border-default)' }}>
              <Bell className="w-[18px] h-[18px] text-secondary" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center bg-[var(--accent-primary)] text-white">{unreadCount}</span>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
