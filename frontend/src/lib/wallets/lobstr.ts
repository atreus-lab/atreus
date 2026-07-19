import { isConnected, getPublicKey, signTransaction } from "@lobstrco/signer-extension-api";
import { WalletProvider } from "../walletTypes";

export class LobstrWalletProvider implements WalletProvider {
  async connect(): Promise<string> {
    const connected = await isConnected();
    if (!connected) {
      throw new Error("LOBSTR signer extension is not installed.");
    }
    const pubKey = await getPublicKey();
    if (!pubKey) {
      throw new Error("Failed to retrieve public key from LOBSTR.");
    }
    localStorage.setItem("atreus_wallet_public_key", pubKey);
    return pubKey;
  }

  async signTransaction(xdr: string): Promise<string> {
    const signed = await signTransaction(xdr);
    if (!signed) {
      throw new Error("Transaction signing rejected or failed in LOBSTR.");
    }
    return signed;
  }

  isAvailable(): boolean {
    return typeof window !== "undefined" && (!!(window as any).lobstrSignerExtensionApi || !!(window as any).lobstr);
  }

  async getPublicKey(): Promise<string> {
    const pubKey = await getPublicKey();
    if (!pubKey) {
      throw new Error("Failed to retrieve public key from LOBSTR.");
    }
    return pubKey;
  }
}
