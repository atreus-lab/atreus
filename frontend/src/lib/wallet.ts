import { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Horizon, rpc } from "@stellar/stellar-sdk";
import * as bip39 from "bip39";

const STORAGE_KEY = "atreus_wallet";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);
const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
const networkPassphrase = Networks.TESTNET;

export interface StoredWallet {
  publicKey: string;
  secretKey: string;
  mnemonic: string;
  email?: string;
}

export function loadWallet(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveWallet(wallet: StoredWallet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function clearWallet() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function generateWallet(email?: string): Promise<StoredWallet> {
  const mnemonic = bip39.generateMnemonic(256);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const kp = Keypair.fromRawEd25519Seed(seed.slice(0, 32));
  const wallet = { publicKey: kp.publicKey(), secretKey: kp.secret(), mnemonic, email };
  saveWallet(wallet);
  return wallet;
}

export async function restoreFromMnemonic(mnemonic: string): Promise<StoredWallet> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const kp = Keypair.fromRawEd25519Seed(seed.slice(0, 32));
  const wallet = { publicKey: kp.publicKey(), secretKey: kp.secret(), mnemonic };
  saveWallet(wallet);
  return wallet;
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

export async function fundWallet(publicKey: string): Promise<boolean> {
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    const data = await res.json();
    return data.successful === true;
  } catch {
    return false;
  }
}

export function getKeypair(): Keypair {
  const wallet = loadWallet();
  if (!wallet) throw new Error("No wallet found. Create one first.");
  return Keypair.fromSecret(wallet.secretKey);
}

export function getPublicKey(): string {
  const wallet = loadWallet();
  if (!wallet) throw new Error("No wallet found.");
  return wallet.publicKey;
}

export async function getBalance(address: string): Promise<string> {
  try {
    const account = await server.loadAccount(address);
    const native = account.balances.find((b: any) => b.asset_type === "native");
    return native?.balance || "0";
  } catch {
    return "0";
  }
}

export async function getBalances(address: string): Promise<any[]> {
  const account = await server.loadAccount(address);
  return account.balances;
}

export async function getTransactions(address: string, limit = 10): Promise<any[]> {
  const payments = await server.payments().forAccount(address).limit(limit).order("desc").call();
  return payments.records
    .filter((p: any) => p.type === "payment" || p.type === "path_payment" || p.type === "create_account")
    .map(p => ({
      id: p.transaction_hash,
      type: p.type,
      amount: (p as any).amount || "0",
      asset_code: (p as any).asset_code || "XLM",
      from: (p as any).from || "",
      to: (p as any).to || "",
      created_at: p.created_at,
      successful: p.transaction_successful ?? true,
    }));
}

export async function sendXLM(destination: string, amount: string): Promise<string> {
  const kp = getKeypair();
  const source = kp.publicKey();
  const account = await server.loadAccount(source);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.payment({
      destination,
      asset: Asset.native(),
      amount,
    }))
    .setTimeout(30)
    .build();

  tx.sign(kp);
  const result = await rpcServer.sendTransaction(tx as any);

  if (result.status === "ERROR") {
    const errMsg = JSON.stringify((result as any).errorResultXdr || "unknown error");
    throw new Error(`Transaction failed: ${errMsg}`);
  }

  return result.hash;
}

export async function hasTrustline(address: string, assetCode: string, assetIssuer: string): Promise<boolean> {
  try {
    const account = await server.loadAccount(address);
    return account.balances.some(
      (b: any) => b.asset_code === assetCode && b.asset_issuer === assetIssuer
    );
  } catch {
    return false;
  }
}

export async function addTrustline(assetCode: string, assetIssuer: string): Promise<string> {
  const kp = getKeypair();
  const source = kp.publicKey();
  const account = await server.loadAccount(source);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.changeTrust({
      asset: new Asset(assetCode, assetIssuer),
    }))
    .setTimeout(30)
    .build();

  tx.sign(kp);
  const result = await rpcServer.sendTransaction(tx as any);
  if (result.status === "ERROR") throw new Error("Failed to add asset");
  return result.hash;
}

export async function swapXLM(destCode: string, destIssuer: string, destAmount: string): Promise<string> {
  const kp = getKeypair();
  const source = kp.publicKey();
  const account = await server.loadAccount(source);
  const xlmAmount = (parseFloat(destAmount) * 1.02).toFixed(7);

  const hasTrust = await hasTrustline(source, destCode, destIssuer);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  });

  if (!hasTrust) {
    tx.addOperation(Operation.changeTrust({
      asset: new Asset(destCode, destIssuer),
    }));
  }

  tx.addOperation(Operation.pathPaymentStrictSend({
    sendAsset: Asset.native(),
    sendAmount: xlmAmount,
    destination: source,
    destAsset: new Asset(destCode, destIssuer),
    destMin: destAmount,
    path: [],
  }));

  const builtTx = tx.setTimeout(30).build();
  builtTx.sign(kp);
  const result = await rpcServer.sendTransaction(builtTx as any);
  if (result.status === "ERROR") throw new Error("Swap failed");
  return result.hash;
}

export function getExplorerUrl(type: "tx" | "account" | "contract", id: string): string {
  const base = "https://stellar.expert/explorer/testnet";
  switch (type) {
    case "tx": return `${base}/tx/${id}`;
    case "account": return `${base}/account/${id}`;
    case "contract": return `${base}/contract/${id}`;
  }
}
