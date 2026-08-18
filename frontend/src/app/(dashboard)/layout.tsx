"use client";

import { SidebarProvider } from "@/components/sidebar-context";
import ProfileModal from "@/components/ProfileModal";
import { CreateLinkModal } from "@/components/motion/create-link-modal";
import { CreateLinkProvider, useCreateLink } from "@/components/sidebar-context";
import "./dashboard.css";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { createLinkOpen, setCreateLinkOpen } = useCreateLink();

  return (
    <div className="app-shell dashboard-light">
      <main className="app-main">
        {children}
      </main>
      <ProfileModal />
      <CreateLinkModal open={createLinkOpen} onOpenChange={setCreateLinkOpen} />
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