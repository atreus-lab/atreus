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
    <div ref={notifRef} className="absolute top-full right-8 sm:right-10 lg:right-12 z-50 w-[380px] max-w-[calc(100vw-3rem)] mt-2 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden animate-[fadeSlideIn_0.2s_ease-out]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="font-extrabold text-slate-900 text-base">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button onClick={onMarkAllRead} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors">
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 px-5">
            <Bell className="w-10 h-10 text-slate-300" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">No notifications yet</p>
              <p className="text-xs font-semibold text-slate-400 mt-1">Notifications for claims, sends, and receives will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            {notifications.map((n) => {
              let iconColor = 'bg-green-50 text-green-600';
              if (n.kind === 'sent') iconColor = 'bg-orange-50 text-orange-500';
              else if (n.kind === 'received') iconColor = 'bg-blue-50 text-blue-500';
              else if (n.kind === 'you_claimed') iconColor = 'bg-purple-50 text-purple-500';
              return (
                <div key={n.id} className={`flex items-start gap-3 px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors group ${n.read ? '' : 'bg-indigo-50/20'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${iconColor}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{n.title}</p>
                      {n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Read"></span>}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-snug">{n.description}</p>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1">
                      {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button onClick={() => onDelete(n.id)} className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all shrink-0 self-start mt-1" title="Delete">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100">
                <button onClick={onDeleteAll} className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors w-full text-center">
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
