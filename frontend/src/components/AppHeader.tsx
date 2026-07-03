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
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--foreground-primary)' }}>
          {backHref && (
            <Link href={backHref} className="btn-icon btn-ghost -ml-1" style={{ borderRadius: '0.5rem' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          {title}
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: 'var(--foreground-secondary)' }}>{subtitle}</p>
      </div>
      {rightContent || (
        <div className="hidden md:flex items-center gap-6">
          {onSearchOpen && (
            <button onClick={onSearchOpen} className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all w-72 group" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)' }}>
              <Search className="w-4 h-4" style={{ color: 'var(--foreground-secondary)' }} />
              <span className="truncate" style={{ color: 'var(--foreground-secondary)' }}>Search anything...</span>
              <div className="ml-auto flex items-center gap-1 shrink-0">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--background-card)', color: 'var(--foreground-secondary)' }}>⌘</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--background-card)', color: 'var(--foreground-secondary)' }}>K</span>
              </div>
            </button>
          )}
          {onBellClick && (
            <button data-bell onClick={onBellClick} className="btn-icon relative" style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-default)', borderRadius: '9999px' }}>
              <Bell className="w-5 h-5" style={{ color: 'var(--foreground-secondary)' }} />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white -translate-y-1/4 translate-x-1/4" style={{ background: 'var(--accent-primary)', color: 'white' }}>{unreadCount}</span>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
