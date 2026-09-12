import { getAddress, requestAccess, isConnected, signTransaction } from "@stellar/freighter-api";
import { WalletProvider } from "../walletTypes";

function toErrorString(e: unknown): string {
  if (typeof e === "string") return e;
  if (Array.isArray(e)) {
    const parts = e
      .map(x => (typeof x === "string" ? x : (x && typeof x === "object" && (x as any).message) || ""))
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "Unknown Freighter error";
  }
  if (e && typeof e === "object") {
    const msg = (e as any).message;
    return typeof msg === "string" && msg.trim() ? msg : "Unknown Freighter error";
  }
  return String(e);
}

export class FreighterWalletProvider implements WalletProvider {
  async connect(): Promise<string> {
    const connected = await isConnected();
    if (!connected.isConnected) {
      throw new Error("Freighter is not installed or not detected in this browser.");
    }
    let access;
    try {
      access = await requestAccess();
    } catch (err) {
      throw new Error(toErrorString(err) || "Freighter access was not granted.");
    }
    if (access.error) {
      throw new Error(toErrorString(access.error));
    }
    const res = await getAddress();
    if (res.error) {
      throw new Error(toErrorString(res.error));
    }
    if (!res.address) {
      throw new Error("Could not retrieve address from Freighter.");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("atreus_wallet_public_key", res.address);
    }
    return res.address;
  }

  async signTransaction(xdr: string): Promise<string> {
    const res = await signTransaction(xdr, {
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    if (res.error) {
      throw new Error(toErrorString(res.error));
    }
    if (!res.signedTxXdr) {
      throw new Error("Failed to sign transaction with Freighter.");
    }
    return res.signedTxXdr;
  }

  isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    // Freighter injects window.stellar or window.freighter
    return !!(window as any).stellar || !!(window as any).freighter;
  }

  async getPublicKey(): Promise<string> {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("atreus_wallet_public_key");
      if (stored) return stored;
    }
    return await this.connect();
  }
}