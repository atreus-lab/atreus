"use client";

import { X, CheckCircle2, Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

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

const ICON_STYLES: Record<string, { background: string; color: string }> = {
  link_claimed: { background: 'rgba(34,197,94,0.1)', color: 'var(--success)' },
  sent: { background: 'rgba(249,115,22,0.1)', color: '#f97316' },
  received: { background: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  you_claimed: { background: 'rgba(168,85,247,0.1)', color: '#a855f7' },
  asset_added: { background: 'rgba(34,197,94,0.1)', color: 'var(--success)' },
};

export default function NotificationDropdown({
  notifications, show, onClose, onMarkAllRead, onDelete, onDeleteAll, notifRef,
}: NotificationDropdownProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={notifRef}
          className="notif-dropdown"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="text-sm font-bold text-primary">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.some(n => !n.read) && (
                <button onClick={onMarkAllRead} className="text-[11px] font-bold px-2 py-1 rounded-md text-accent bg-[rgba(59,130,246,0.1)] transition-colors hover:bg-[rgba(59,130,246,0.15)]">
                  Mark all read
                </button>
              )}
              <button onClick={onClose} className="p-1 hover:bg-[rgba(255,255,255,0.05)] rounded-md transition-colors">
                <X className="w-4 h-4 text-secondary" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 px-4">
                <Bell className="w-8 h-8 text-secondary" />
                <div className="text-center">
                  <p className="text-sm font-bold text-primary">No notifications yet</p>
                  <p className="text-xs text-secondary mt-1">Notifications for claims, sends, and receives will appear here.</p>
                </div>
              </div>
            ) : (
              <>
                {notifications.map((n) => {
                  const iconStyle = ICON_STYLES[n.kind] || ICON_STYLES.link_claimed;
                  return (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 transition-colors group" style={{ borderBottom: '1px solid var(--border-default)', background: n.read ? undefined : 'rgba(59,130,246,0.04)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={iconStyle}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-bold text-primary">{n.title}</p>
                        <p className="text-xs text-secondary mt-0.5 leading-snug">{n.description}</p>
                        <span className="text-[10px] text-secondary mt-1">
                          {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button onClick={() => onDelete(n.id)} className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[rgba(248,113,113,0.1)] text-secondary transition-all shrink-0 self-start" title="Delete">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <button onClick={onDeleteAll} className="text-xs font-bold text-error w-full text-center py-1 rounded-md transition-colors hover:bg-[rgba(248,113,113,0.06)]">
                      Delete all notifications
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
