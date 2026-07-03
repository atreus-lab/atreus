"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SidebarContextType {
  collapsed: boolean;
  toggleCollapsed: () => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
}

interface CreateLinkContextType {
  createLinkOpen: boolean;
  setCreateLinkOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggleCollapsed: () => {},
  profileOpen: false,
  setProfileOpen: () => {},
});

const CreateLinkContext = createContext<CreateLinkContextType>({
  createLinkOpen: false,
  setCreateLinkOpen: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => !c);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed, profileOpen, setProfileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function CreateLinkProvider({ children }: { children: ReactNode }) {
  const [createLinkOpen, setCreateLinkOpen] = useState(false);

  return (
    <CreateLinkContext.Provider value={{ createLinkOpen, setCreateLinkOpen }}>
      {children}
    </CreateLinkContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

export function useCreateLink() {
  return useContext(CreateLinkContext);
}
