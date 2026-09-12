"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: number;
  read: boolean;
  kind: string;
}

interface SidebarContextType {
  collapsed: boolean;
  toggleCollapsed: () => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  settingsRequested: boolean;
  requestSettings: () => void;
  clearSettingsRequest: () => void;
  securityRequested: boolean;
  requestSecurity: () => void;
  clearSecurityRequest: () => void;
  activityRequested: boolean;
  requestActivity: () => void;
  clearActivityRequest: () => void;
  notifications: AppNotification[];
  pushNotification: (n: AppNotification) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllNotifications: () => void;
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
  settingsRequested: false,
  requestSettings: () => {},
  clearSettingsRequest: () => {},
  securityRequested: false,
  requestSecurity: () => {},
  clearSecurityRequest: () => {},
  activityRequested: false,
  requestActivity: () => {},
  clearActivityRequest: () => {},
  notifications: [],
  pushNotification: () => {},
  markAllNotificationsRead: () => {},
  deleteNotification: () => {},
  deleteAllNotifications: () => {},
});

const CreateLinkContext = createContext<CreateLinkContextType>({
  createLinkOpen: false,
  setCreateLinkOpen: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsRequested, setSettingsRequested] = useState(false);
  const [securityRequested, setSecurityRequested] = useState(false);
  const [activityRequested, setActivityRequested] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => !c);
  }, []);

  const requestSettings = useCallback(() => setSettingsRequested(true), []);
  const clearSettingsRequest = useCallback(() => setSettingsRequested(false), []);
  const requestSecurity = useCallback(() => setSecurityRequested(true), []);
  const clearSecurityRequest = useCallback(() => setSecurityRequested(false), []);
  const requestActivity = useCallback(() => setActivityRequested(true), []);
  const clearActivityRequest = useCallback(() => setActivityRequested(false), []);

  const pushNotification = useCallback((n: AppNotification) => {
    setNotifications(prev => [n, ...prev].slice(0, 50));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const deleteAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed, profileOpen, setProfileOpen, settingsRequested, requestSettings, clearSettingsRequest, securityRequested, requestSecurity, clearSecurityRequest, activityRequested, requestActivity, clearActivityRequest, notifications, pushNotification, markAllNotificationsRead, deleteNotification, deleteAllNotifications }}>
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
