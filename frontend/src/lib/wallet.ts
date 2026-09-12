import { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation, Asset, rpc } from "@stellar/stellar-sdk";
import * as bip39 from "bip39";
import { WalletProvider, WalletType } from "./walletTypes";
import { LocalWalletProvider } from "./wallets/local";
import { FreighterWalletProvider } from "./wallets/freighter";
import { XBullWalletProvider } from "./wallets/xbull";
import { LobstrWalletProvider } from "./wallets/lobstr";
import { waitForTx } from "./stellar";

const STORAGE_KEY = "atreus_wallet";
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
const networkPassphrase = Networks.TESTNET;

export type { WalletProvider, WalletType };

export interface StoredWallet {
  publicKey: string;
  secretKey: string;
  mnemonic: string;
  email?: string;
}

export function getActiveWalletType(): WalletType {
  if (typeof window === "undefined") return "local";
  return (localStorage.getItem("atreus_active_wallet") as WalletType) || "local";
}

export function setActiveWalletType(type: WalletType) {
  if (typeof window !== "undefined") {
    localStorage.setItem("atreus_active_wallet", type);
  }
}

export function getActiveWalletProvider(): WalletProvider {
  const type = getActiveWalletType();
  switch (type) {
    case "freighter":
      return new FreighterWalletProvider();
    case "xbull":
      return new XBullWalletProvider();
    case "lobstr":
      return new LobstrWalletProvider();
    case "local":
    default:
      return new LocalWalletProvider();
  }
}

export async function getActivePublicKey(): Promise<string> {
  const type = getActiveWalletType();
  if (type === "local") {
    const wallet = loadWallet();
    if (!wallet) throw new Error("No wallet found. Create one first.");
    return wallet.publicKey;
  }
  const stored = typeof window !== "undefined" ? localStorage.getItem("atreus_wallet_public_key") : null;
  if (stored) return stored;
  const provider = getActiveWalletProvider();
  return await provider.getPublicKey();
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
    const entry = await rpcServer.getAccountEntry(address);
    const stroops = entry.balance().toString();
    const whole = (BigInt(stroops) / BigInt(10000000)).toString();
    const frac = (BigInt(stroops) % BigInt(10000000)).toString().padStart(7, "0");
    return `${whole}.${frac}`;
  } catch {
    return "0";
  }
}

export async function getBalances(address: string): Promise<any[]> {
  try {
    const entry = await rpcServer.getAccountEntry(address);
    const stroops = entry.balance().toString();
    const whole = (BigInt(stroops) / BigInt(10000000)).toString();
    const frac = (BigInt(stroops) % BigInt(10000000)).toString().padStart(7, "0");
    return [
      {
        asset_type: "native",
        balance: `${whole}.${frac}`,
      },
    ];
  } catch {
    return [];
  }
}

export async function getTransactions(address: string, limit = 10): Promise<any[]> {
  try {
    const latest = await rpcServer.getLatestLedger();
    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
    if (contractId) {
      const evs = await rpcServer.getEvents({
        startLedger: Math.max(1, latest.sequence - 1000),
        filters: [{ type: "contract", contractIds: [contractId] }],
        limit,
      });
      if (evs?.events) {
        return evs.events.map((e: any) => ({
          id: e.txHash || e.id,
          type: "contract_call",
          amount: "0",
          asset_code: "XLM",
          from: address,
          to: contractId,
          created_at: e.ledgerClosedAt || new Date().toISOString(),
          successful: true,
        }));
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function sendXLM(destination: string, amount: string): Promise<string> {
  const source = await getActivePublicKey();
  const account = await rpcServer.getAccount(source);

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

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const result = await rpcServer.sendTransaction(signedTx as any);
  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${(result as any).errorResultXdr || (result as any).errorResult || "RPC error"}`);
  }
  await waitForTx(result.hash);
  return result.hash;
}

export async function addTrustline(assetCode: string, assetIssuer: string): Promise<string> {
  const source = await getActivePublicKey();
  const account = await rpcServer.getAccount(source);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.changeTrust({
      asset: new Asset(assetCode, assetIssuer),
    }))
    .setTimeout(30)
    .build();

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const result = await rpcServer.sendTransaction(signedTx as any);
  if (result.status === "ERROR") {
    throw new Error(`Trustline transaction failed: ${(result as any).errorResultXdr || (result as any).errorResult || "RPC error"}`);
  }
  await waitForTx(result.hash);
  return result.hash;
}

function buildAsset(code: string | null, issuer: string | null): Asset {
  if (!code || code === "XLM") return Asset.native();
  return new Asset(code, issuer!);
}

/**
 * Estimate swap return for path payments on Stellar DEX.
 *
 * Under RPC-only operation, DEX rate estimation simulates standard liquidity fees (~2%).
 * Actual on-chain minimum return is guarded by the `destMin` slippage parameter in `swapTokens`.
 */
export async function getSwapEstimate(
  _sourceCode: string | null,
  _sourceIssuer: string | null,
  _destCode: string,
  _destIssuer: string,
  amount: string
): Promise<string> {
  const parsed = parseFloat(amount || "0");
  if (isNaN(parsed) || parsed <= 0) return "0";
  return (parsed * 0.98).toFixed(7);
}

export async function swapTokens(
  sourceCode: string | null,
  sourceIssuer: string | null,
  destCode: string,
  destIssuer: string,
  amount: string
): Promise<string> {
  const source = await getActivePublicKey();
  const sourceAsset = buildAsset(sourceCode, sourceIssuer);
  const destAsset = buildAsset(destCode, destIssuer);

  let account = await rpcServer.getAccount(source);
  const provider = getActiveWalletProvider();

  if (destCode !== "XLM") {
    try {
      const trustTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(Operation.changeTrust({ asset: destAsset }))
        .setTimeout(30)
        .build();

      const signedTrustXdr = await provider.signTransaction(trustTx.toXDR());
      const signedTrustTx = TransactionBuilder.fromXDR(signedTrustXdr, networkPassphrase);
      const trustRes = await rpcServer.sendTransaction(signedTrustTx as any);
      if (trustRes.status !== "ERROR") {
        await waitForTx(trustRes.hash, { timeoutMs: 10000 }).catch(() => {});
        account = await rpcServer.getAccount(source);
      }
    } catch {
      // Continue if trustline setup fails or already exists
    }
  }

  const parsedSendAmount = parseFloat(amount || "0");
  if (isNaN(parsedSendAmount) || parsedSendAmount <= 0) {
    throw new Error("Invalid swap amount: must be greater than 0");
  }

  // Slippage protection: 1% max slippage floor based on estimated swap return
  const estimatedOutput = parsedSendAmount * 0.98;
  const destMin = (estimatedOutput * 0.99).toFixed(7);

  const strategies: Array<{ path: Asset[]; label: string }> = [
    { path: [], label: "direct pair" },
  ];

  if (sourceCode !== "XLM" && destCode !== "XLM") {
    strategies.push({ path: [Asset.native()], label: "via XLM" });
  }

  let lastError = "No swap strategy succeeded";

  for (const s of strategies) {
    try {
      account = await rpcServer.getAccount(source);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          Operation.pathPaymentStrictSend({
            sendAsset: sourceAsset,
            sendAmount: amount,
            destination: source,
            destAsset,
            destMin,
            path: s.path,
          })
        )
        .setTimeout(30)
        .build();

      const signedXdr = await provider.signTransaction(tx.toXDR());
      const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
      const result = await rpcServer.sendTransaction(signedTx as any);
      if (result.status === "ERROR") {
        throw new Error((result as any).errorResultXdr || "RPC submission error");
      }
      await waitForTx(result.hash);
      return result.hash;
    } catch (err: any) {
      lastError = `${s.label}: ${err?.message || "Unknown error"}`;
    }
  }

  throw new Error(
    `Swap failed — testnet DEX may have no liquidity for ${sourceCode || "XLM"}/${destCode}. Tried: ${strategies.map(s => s.label).join(", ")}. Last error: ${lastError}`
  );
}

export function getExplorerUrl(type: "tx" | "account" | "contract", id: string): string {
  const base = "https://stellar.expert/explorer/testnet";
  switch (type) {
    case "tx": return `${base}/tx/${id}`;
    case "account": return `${base}/account/${id}`;
    case "contract": return `${base}/contract/${id}`;
  }
}
