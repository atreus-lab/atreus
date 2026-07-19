import { xBullWalletConnect } from "@creit.tech/xbull-wallet-connect";
import { WalletProvider } from "../walletTypes";

export class XBullWalletProvider implements WalletProvider {
  private getBridge(): xBullWalletConnect {
    return new xBullWalletConnect();
  }

  async connect(): Promise<string> {
    const bridge = this.getBridge();
    try {
      const pubKey = await bridge.connect();
      if (!pubKey) {
        throw new Error("Failed to retrieve public key from xBull.");
      }
      localStorage.setItem("atreus_wallet_public_key", pubKey);
      return pubKey;
    } finally {
      bridge.closeConnections();
    }
  }

  async signTransaction(xdr: string): Promise<string> {
    const bridge = this.getBridge();
    try {
      let pubKey = localStorage.getItem("atreus_wallet_public_key");
      if (!pubKey) {
        pubKey = await bridge.connect();
      }
      const signed = await bridge.sign({
        xdr,
        publicKey: pubKey,
        network: "TESTNET",
      });
      if (!signed) {
        throw new Error("Transaction signing rejected or failed in xBull.");
      }
      return signed;
    } finally {
      bridge.closeConnections();
    }
  }

  isAvailable(): boolean {
    return typeof window !== "undefined";
  }

  async getPublicKey(): Promise<string> {
    const bridge = this.getBridge();
    try {
      const pubKey = await bridge.connect();
      if (!pubKey) {
        throw new Error("Failed to retrieve public key from xBull.");
      }
      return pubKey;
    } finally {
      bridge.closeConnections();
    }
  }
}
