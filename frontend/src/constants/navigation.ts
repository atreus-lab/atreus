import { LayoutDashboard, Wallet, Link2, ArrowRightLeft, BarChart3, Activity, Shield, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
}

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Link2, label: "Payment Links" },
  { icon: ArrowRightLeft, label: "Swap", href: "/swap" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Activity, label: "Activity", href: "/activity" },
  { icon: Shield, label: "Security", href: "/security" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

/** Helper to build nav items with a specific page marked as active */
export function getNavItems(activeLabel?: string): (NavItem & { active: boolean })[] {
  return NAV_ITEMS.map(item => ({
    ...item,
    active: activeLabel ? item.label === activeLabel : false,
  }));
}
