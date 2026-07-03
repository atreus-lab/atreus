"use client";

import { SidebarProvider } from "@/components/sidebar-context";
import DashboardSidebar from "@/components/DashboardSidebar";
import ProfileModal from "@/components/ProfileModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="app-shell">
        <DashboardSidebar />
        <main className="app-main">
          {children}
        </main>
        <ProfileModal />
      </div>
    </SidebarProvider>
  );
}
