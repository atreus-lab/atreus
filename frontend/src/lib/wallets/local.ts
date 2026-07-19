import { loadWallet } from "../wallet";
import { WalletProvider } from "../walletTypes";

export class LocalWalletProvider implements WalletProvider {
  async connect(): Promise<string> {
    const wallet = loadWallet();
    if (!wallet) {
      throw new Error("No wallet found. Create one first.");
    }
    return wallet.publicKey;
  }

  async signTransaction(xdr: string): Promise<string> {
    const wallet = loadWallet();
    if (!wallet) {
      throw new Error("No wallet found. Create one first.");
    }
    const { Keypair, TransactionBuilder, Networks } = await import("@stellar/stellar-sdk");
    const kp = Keypair.fromSecret(wallet.secretKey);
    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    tx.sign(kp);
    return tx.toXDR();
  }

  isAvailable(): boolean {
    return true;
  }

  async getPublicKey(): Promise<string> {
    const wallet = loadWallet();
    if (!wallet) {
      throw new Error("No wallet found. Create one first.");
    }
    return wallet.publicKey;
  }
}
