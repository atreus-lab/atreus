"use client";

import { useState } from "react";
import { SidebarProvider } from "@/components/sidebar-context";
import DashboardSidebar from "@/components/DashboardSidebar";
import ProfileModal from "@/components/ProfileModal";
import { Drawer } from "@/components/motion/drawer";
import { CreateLinkModal } from "@/components/motion/create-link-modal";
import { CreateLinkProvider, useCreateLink } from "@/components/sidebar-context";
import "./dashboard.css";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { createLinkOpen, setCreateLinkOpen } = useCreateLink();

  return (
    <div className="app-shell">
      <DashboardSidebar />
      <main className="app-main">
        {children}
      </main>
      <ProfileModal />
      <CreateLinkModal open={createLinkOpen} onOpenChange={setCreateLinkOpen} />

      {/* Mobile drawer: only the open button visible when closed */}
      {!drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 lg:hidden w-10 h-20 rounded-r-xl bg-[var(--background-card)] border border-l-0 border-[var(--border-default)] flex items-center justify-center shadow-lg hover:bg-[var(--background-elevated)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-secondary">
            <rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="1" y="12" width="14" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
      )}

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        side="left"
        className="lg:hidden"
        ariaLabel="Mobile navigation"
      >
        <DashboardSidebar />
      </Drawer>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <CreateLinkProvider>
        <DashboardInner>{children}</DashboardInner>
      </CreateLinkProvider>
    </SidebarProvider>
  );
}
