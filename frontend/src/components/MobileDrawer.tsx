"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import logo from "../media/ateruslogo.jpeg";

interface NavItem {
  icon: any;
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  emailName: string;
  displayAddress: string;
}

export default function MobileDrawer({ open, onClose, navItems, emailName, displayAddress }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-[280px] flex flex-col bg-[var(--background-card)]"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="px-5 pt-6 pb-4 shrink-0 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
                <Image src={logo} alt="Atreus" width={28} height={28} className="rounded-lg" />
                <span className="font-extrabold text-lg tracking-tight text-primary">Atreus</span>
              </Link>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <X className="w-4 h-4 text-secondary" />
              </button>
            </div>

            <nav className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col gap-1 py-2">
              {navItems.map((item, i) => {
                const cls = `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  item.active ? 'bg-elevated text-primary font-semibold' : 'text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]'
                }`;
                if (item.href) {
                  return (
                    <Link key={i} href={item.href} onClick={onClose} className={cls}>
                      <item.icon className="w-[18px] h-[18px]" />
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <button key={i} onClick={() => { item.onClick?.(); onClose(); }} className={`${cls} text-left`}>
                    <item.icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
              <div className="flex items-center gap-2.5 p-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-[var(--accent-primary)] text-white">
                  {emailName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-primary truncate">{emailName}</span>
                  <span className="text-[10px] text-secondary truncate">{displayAddress}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
