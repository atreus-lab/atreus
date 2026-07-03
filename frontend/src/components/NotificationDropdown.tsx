"use client";

import { X, ChevronDown, CheckCircle2, Bell } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: number;
  read: boolean;
  kind: string;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  show: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  notifRef: React.Ref<HTMLDivElement>;
}

export default function NotificationDropdown({
  notifications,
  show,
  onClose,
  onMarkAllRead,
  onDelete,
  onDeleteAll,
  notifRef,
}: NotificationDropdownProps) {
  if (!show) return null;

  return (
    <div ref={notifRef} className="absolute top-full right-8 sm:right-10 lg:right-12 z-50 w-[380px] max-w-[calc(100vw-3rem)] mt-2 rounded-2xl overflow-hidden animate-[fadeSlideIn_0.2s_ease-out]" style={{ background: 'var(--background-card)', border: '1px solid var(--border-default)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <h3 className="section-title" style={{ fontSize: '1rem' }}>Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button onClick={onMarkAllRead} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--accent-primary)', background: 'rgba(59,130,246,0.15)' }}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 px-5">
            <Bell className="w-10 h-10 text-slate-300" />
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: 'var(--foreground-primary)' }}>No notifications yet</p>
              <p className="text-xs font-semibold text-slate-400 mt-1">Notifications for claims, sends, and receives will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            {notifications.map((n) => {
              let iconStyle = { background: 'rgba(34,197,94,0.15)', color: 'var(--success)' };
              if (n.kind === 'sent') iconStyle = { background: 'rgba(249,115,22,0.15)', color: '#f97316' };
              else if (n.kind === 'received') iconStyle = { background: 'rgba(59,130,246,0.15)', color: '#3b82f6' };
              else if (n.kind === 'you_claimed') iconStyle = { background: 'rgba(168,85,247,0.15)', color: '#a855f7' };
              return (
                <div key={n.id} className="flex items-start gap-3 px-5 py-4 transition-colors group" style={{ borderBottom: '1px solid var(--border-default)', background: n.read ? undefined : 'rgba(59,130,246,0.08)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={iconStyle}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: 'var(--foreground-primary)' }}>{n.title}</p>
                      {n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Read"></span>}
                    </div>
                    <p className="text-xs font-semibold mt-0.5 leading-snug" style={{ color: 'var(--foreground-secondary)' }}>{n.description}</p>
                    <span className="text-[10px] font-semibold mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                      {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button onClick={() => onDelete(n.id)} className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-slate-300 transition-all shrink-0 self-start mt-1" title="Delete">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {notifications.length > 0 && (
              <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
                <button onClick={onDeleteAll} className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors w-full text-center" style={{ color: 'var(--error)' }}>
                  Delete all notifications
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
