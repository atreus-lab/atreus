import { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Horizon } from "@stellar/stellar-sdk";
import * as bip39 from "bip39";

const STORAGE_KEY = "atreus_wallet";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);
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
    .map(p => {
      const rec = p as any;
      // create_account uses funder/account/starting_balance instead of from/to/amount
      const isCreate = rec.type === "create_account";
      return {
        id: rec.transaction_hash,
        type: rec.type,
        amount: isCreate ? (rec.starting_balance || "0") : (rec.amount || "0"),
        asset_code: isCreate ? "XLM" : (rec.asset_code || "XLM"),
        from: isCreate ? (rec.funder || "") : (rec.from || ""),
        to: isCreate ? (rec.account || "") : (rec.to || ""),
        created_at: rec.created_at,
        successful: rec.transaction_successful ?? true,
      };
    });
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
  const result = await server.submitTransaction(tx);
  return result.hash;
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
  const result = await server.submitTransaction(tx);
  return result.hash;
}

function buildAsset(code: string | null, issuer: string | null): Asset {
  if (!code || code === "XLM") return Asset.native();
  return new Asset(code, issuer!);
}

export async function getSwapEstimate(
  sourceCode: string | null,
  sourceIssuer: string | null,
  destCode: string,
  destIssuer: string,
  amount: string
): Promise<string> {
  const sourceAsset = buildAsset(sourceCode, sourceIssuer);
  const destAsset = buildAsset(destCode, destIssuer);
  try {
    const pathsResult = await server.strictSendPaths(
      sourceAsset,
      amount,
      [destAsset]
    ).call();
    if (pathsResult.records.length === 0) return "0";
    return pathsResult.records[0].destination_amount;
  } catch {
    return "0";
  }
}

export async function swapTokens(
  sourceCode: string | null,
  sourceIssuer: string | null,
  destCode: string,
  destIssuer: string,
  amount: string
): Promise<string> {
  const kp = getKeypair();
  const source = kp.publicKey();

  const sourceAsset = buildAsset(sourceCode, sourceIssuer);
  const destAsset = buildAsset(destCode, destIssuer);

  // Single loadAccount — reused for trustline check and tx building
  let account = await server.loadAccount(source);

  // Add dest trustline if needed (issued asset and not already trusted)
  if (destCode !== "XLM") {
    const hasTrust = account.balances.some(
      (b: any) => b.asset_code === destCode && b.asset_issuer === destIssuer
    );
    if (!hasTrust) {
      const trustTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(Operation.changeTrust({ asset: destAsset }))
        .setTimeout(30)
        .build();

      trustTx.sign(kp);
      await server.submitTransaction(trustTx);
      // Reload after trustline (seq number changed)
      account = await server.loadAccount(source);
    }
  }

  const destMin = (parseFloat(amount) * 0.01).toFixed(7);

  // Strategies: direct pair first, then via XLM intermediary
  const strategies: Array<{ path: Asset[]; label: string }> = [
    { path: [], label: "direct pair" },
  ];

  if (sourceCode !== "XLM" && destCode !== "XLM") {
    strategies.push({ path: [Asset.native()], label: "via XLM" });
  }

  let lastError = "No swap strategy succeeded";

  for (const s of strategies) {
    try {
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

      tx.sign(kp);
      const result = await server.submitTransaction(tx);
      return result.hash;
    } catch (err: any) {
      const msg = err?.response?.data?.extras?.result_codes
        ? JSON.stringify(err.response.data.extras.result_codes)
        : err?.message || `Unknown error`;
      lastError = `${s.label}: ${msg}`;
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
