"use client";

import { Bell, X, CircleCheckBig, ArrowUpRight, ArrowDownLeft, ArrowDownToLine, Plus } from "lucide-react";
import type { AppNotification } from "./sidebar-context";

interface NotificationDropdownProps {
  notifications: AppNotification[];
  show: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}

const KIND_COLORS: Record<string, string> = {
  link_claimed: "#16a34a",
  sent: "#ef4444",
  received: "#16a34a",
  you_claimed: "#007cbf",
  asset_added: "#f59e0b",
};

const KIND_ICONS: Record<string, any> = {
  link_claimed: CircleCheckBig,
  sent: ArrowUpRight,
  received: ArrowDownLeft,
  you_claimed: ArrowDownToLine,
  asset_added: Plus,
};

export default function NotificationDropdown({
  notifications, show, onClose, onMarkAllRead, onDelete, onDeleteAll,
}: NotificationDropdownProps) {
  if (!show) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-2 flex w-[340px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border border-grey-100 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-grey-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-grey-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primaryBlue px-1 text-[9px] font-bold text-white">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100 active:bg-blue-200">
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-grey-600 transition-colors hover:bg-grey-25 active:bg-grey-50" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10">
              <Bell className="h-8 w-8 text-grey-300" />
              <div className="text-center">
                <p className="text-sm font-semibold text-grey-800">No notifications yet</p>
                <p className="mt-1 text-xs text-grey-500">Notifications for claims, sends, and receives will appear here.</p>
              </div>
            </div>
          ) : (
            <>
              {notifications.map(n => {
                const color = KIND_COLORS[n.kind] || "#007cbf";
                const IconComponent = KIND_ICONS[n.kind] || CircleCheckBig;
                return (
                  <div key={n.id} className={`group flex items-start gap-3 border-b border-grey-100 px-4 py-3 last:border-b-0 ${n.read ? "" : "bg-grey-25"}`}>
                    <IconComponent className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-sm font-semibold text-grey-800">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-snug text-grey-500">{n.description}</p>
                      <span className="mt-1 text-[10px] text-grey-400">
                        {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button onClick={() => onDelete(n.id)} className="flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full text-grey-400 opacity-0 transition-opacity hover:bg-grey-50 hover:text-error group-hover:opacity-100" title="Delete">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              <div className="px-4 py-2.5">
                <button onClick={onDeleteAll} className="w-full rounded-lg py-1.5 text-xs font-semibold text-error transition-colors hover:bg-red-50">
                  Delete all notifications
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}