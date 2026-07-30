import { getAddress, signTransaction } from "@stellar/freighter-api";
import { WalletProvider } from "../walletTypes";

export class FreighterWalletProvider implements WalletProvider {
  async connect(): Promise<string> {
    const res = await getAddress();
    if (res.error) {
      throw new Error(res.error);
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
      throw new Error(res.error);
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
