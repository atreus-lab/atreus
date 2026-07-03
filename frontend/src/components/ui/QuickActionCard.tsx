"use client";

import Link from "next/link";
import { type ReactNode } from "react";

interface QuickActionCardProps {
  icon: ReactNode;
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  iconColor?: string;
}

export default function QuickActionCard({ icon, label, description, href, onClick, iconColor }: QuickActionCardProps) {
  const content = (
    <>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconColor ? `${iconColor}15` : 'rgba(255,255,255,0.05)', color: iconColor || 'var(--foreground-secondary)' }}
      >
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold text-primary truncate">{label}</span>
        <span className="text-[10px] text-secondary truncate">{description}</span>
      </div>
    </>
  );

  if (href) {
    return <Link href={href} className="quick-action-card">{content}</Link>;
  }
  return <button onClick={onClick} className="quick-action-card text-left">{content}</button>;
}
