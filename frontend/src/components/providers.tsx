"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { getActiveWalletType, setActiveWalletType, WalletType, loadWallet, clearWallet, getActiveWalletProvider } from "@/lib/wallet";

interface WalletContextType {
  activeWalletType: WalletType;
  publicKey: string | null;
  isLoading: boolean;
  connectWallet: (type: WalletType) => Promise<string>;
  disconnectWallet: () => void;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within a WalletProvider");
  return context;
}

export function Providers({ children, clientId }: { children: React.ReactNode; clientId: string }) {
  const [activeWalletType, setActiveWalletTypeState] = useState<WalletType>("local");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const type = getActiveWalletType();
      setActiveWalletTypeState(type);
      if (type === "local") {
        const wallet = loadWallet();
        setPublicKey(wallet ? wallet.publicKey : null);
      } else {
        const storedKey = typeof window !== "undefined" ? localStorage.getItem("atreus_wallet_public_key") : null;
        setPublicKey(storedKey);
      }
    } catch (err) {
      console.error("Failed to load active wallet:", err);
      setPublicKey(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const connectWallet = async (type: WalletType): Promise<string> => {
    setIsLoading(true);
    try {
      setActiveWalletType(type);
      setActiveWalletTypeState(type);
      if (type === "local") {
        const wallet = loadWallet();
        if (!wallet) throw new Error("No local wallet found. Please generate or restore one.");
        setPublicKey(wallet.publicKey);
        return wallet.publicKey;
      } else {
        const provider = getActiveWalletProvider();
        const key = await provider.connect();
        setPublicKey(key);
        return key;
      }
    } catch (err: any) {
      setActiveWalletType("local");
      setActiveWalletTypeState("local");
      const wallet = loadWallet();
      setPublicKey(wallet ? wallet.publicKey : null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    if (activeWalletType !== "local") {
      localStorage.removeItem("atreus_wallet_public_key");
      setActiveWalletType("local");
      setActiveWalletTypeState("local");
      const wallet = loadWallet();
      setPublicKey(wallet ? wallet.publicKey : null);
    } else {
      clearWallet();
      setPublicKey(null);
    }
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <WalletContext.Provider value={{ activeWalletType, publicKey, isLoading, connectWallet, disconnectWallet, refresh }}>
        {children}
      </WalletContext.Provider>
    </GoogleOAuthProvider>
  );
}
