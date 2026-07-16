import { Horizon, Networks, TransactionBuilder, Asset, Contract, Address, nativeToScVal, xdr, rpc, Keypair, BASE_FEE, Operation } from "@stellar/stellar-sdk";
import { getKeypair, loadWallet } from "./wallet";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const networkPassphrase = Networks.TESTNET;

export const nativeAsset = Asset.native();

export interface Balance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: string;
  asset_code?: string;
  from?: string;
  to?: string;
  memo?: string;
  created_at: string;
  successful: boolean;
}

export const connectWallet = async (): Promise<string> => {
  const wallet = loadWallet();
  if (!wallet) throw new Error("No wallet found. Create one on the wallet page.");
  return wallet.publicKey;
};

export const xlmToStroops = (amount: string): bigint => {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(trimmed)) {
    throw new Error("Invalid amount: use up to 7 decimal places");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const paddedFrac = frac.padEnd(7, "0");
  return BigInt(whole) * BigInt(10000000) + BigInt(paddedFrac || "0");
};

export const waitForTransaction = async (
  hash: string,
  { timeoutMs = 30_000, intervalMs = 1500 }: { timeoutMs?: number; intervalMs?: number } = {}
) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await rpcServer.getTransaction(hash);
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return result;
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`Transaction failed on-chain (hash: ${hash})`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for transaction (hash: ${hash})`);
};

export const createEscrowTx = async (creator: string, amount: string, hash: Uint8Array, expiry?: number, recipientEmailHash?: Uint8Array) => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");

  const tokenId = process.env.NEXT_PUBLIC_TOKEN_ID;
  if (!tokenId) throw new Error("NEXT_PUBLIC_TOKEN_ID is not configured");

  // Balance check — friendly error if insufficient funds
  const balance = await getNativeBalance(creator);
  const amountNum = parseFloat(amount);
  const estimatedFee = 0.01; // 100,000 stroops
  if (parseFloat(balance) < amountNum + estimatedFee) {
    throw new Error(
      `Insufficient balance: you have ${balance} XLM but need at least ${(amountNum + estimatedFee).toFixed(7)} XLM (${amount} + fees)`
    );
  }

  const contract = new Contract(contractId);
  const amountStroops = xlmToStroops(amount);
  const linkExpiry = expiry ?? (Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

  const hasRecipient = recipientEmailHash && recipientEmailHash.length === 32;
  const policyType = hasRecipient ? 1 : 0;
  const policyParams = hasRecipient ? recipientEmailHash! : new Uint8Array(0);

  const op = contract.call(
    "create_link",
    xdr.ScVal.scvBytes(Buffer.from(hash)),
    nativeToScVal(policyType, { type: 'u32' }),
    xdr.ScVal.scvBytes(Buffer.from(policyParams)),
    nativeToScVal(amountStroops, { type: 'i128' }),
    new Address(tokenId).toScVal(),
    nativeToScVal(linkExpiry, { type: 'u64' }),
    new Address(creator).toScVal()
  );

  let account;
  try {
    account = await rpcServer.getAccount(creator);
  } catch {
    throw new Error("Could not load your account. Make sure it's funded on testnet.");
  }

  let tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(120)
    .build();

  try {
    tx = (await rpcServer.prepareTransaction(tx)) as any;
  } catch (err: any) {
    throw new Error(`Failed to simulate transaction: ${err?.message || err}`);
  }

  const kp = getKeypair();
  tx.sign(kp);

  let sendResult;
  try {
    sendResult = await rpcServer.sendTransaction(tx as any);
  } catch (err: any) {
    throw new Error(`Could not reach the Stellar network: ${err?.message || err}`);
  }

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction rejected: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  await waitForTransaction(sendResult.hash);
  return sendResult.hash;
};

export const claimLinkTx = async (
  recipient: string,
  linkHash: Uint8Array,
  secret: Uint8Array,
  recipientEmailHash?: Uint8Array,
) => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");

  // Check recipient is funded on testnet — clear error instead of opaque RPC failure
  let account;
  try {
    account = await rpcServer.getAccount(recipient);
  } catch {
    throw new Error("Recipient account isn't funded on testnet — fund it first via friendbot.");
  }

  const contract = new Contract(contractId);

  const op = contract.call(
    "claim_link",
    xdr.ScVal.scvBytes(Buffer.from(linkHash)),
    new Address(recipient).toScVal(),
    xdr.ScVal.scvBytes(Buffer.from(secret)),
    xdr.ScVal.scvBytes(Buffer.from(recipientEmailHash ?? new Uint8Array(32))),
  );

  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op).setTimeout(120).build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const kp = getKeypair();
  tx.sign(kp);

  const sendResult = await rpcServer.sendTransaction(tx as any);

  if (sendResult.status === "ERROR") {
    throw new Error(`Tx submission failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }
  return sendResult.hash;
};

// submitProofTx removed — replaced by the attestation-oracle pattern.
// Real ZK proofs are now verified off-chain by the backend attester, which submits
// a signed attestation to the VerifierContract. See frontend/src/lib/zk.ts.

export const getAccountBalances = async (address: string): Promise<Balance[]> => {
  const account = await server.loadAccount(address);
  return account.balances as Balance[];
};

export const getNativeBalance = async (address: string): Promise<string> => {
  const balances = await getAccountBalances(address);
  const native = balances.find(b => b.asset_type === "native");
  return native?.balance || "0";
};

export const getRecentTransactions = async (address: string, limit = 10): Promise<Transaction[]> => {
  const payments = await server.payments().forAccount(address).limit(limit).order("desc").call();
  return payments.records.map(p => ({
    id: p.transaction_hash,
    type: p.type,
    amount: (p as any).amount || "0",
    asset_code: (p as any).asset_code || "XLM",
    from: (p as any).from || "",
    to: (p as any).to || "",
    created_at: p.created_at,
    successful: p.transaction_successful ?? true,
  }));
};

export const sendXLM = async (sender: string, destination: string, amount: string): Promise<string> => {
  const account = await server.loadAccount(sender);
  let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.payment({ destination, asset: Asset.native(), amount }))
    .setTimeout(30).build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const kp = getKeypair();
  tx.sign(kp);

  const result = await rpcServer.sendTransaction(tx as any);
  if (result.status === "ERROR") throw new Error("Transaction failed");
  return result.hash;
};

export const getStellarExpertUrl = (type: "tx" | "account" | "contract", id: string): string => {
  const base = "https://stellar.expert/explorer/testnet";
  switch (type) {
    case "tx": return `${base}/tx/${id}`;
    case "account": return `${base}/account/${id}`;
    case "contract": return `${base}/contract/${id}`;
  }
};

export const findSwapPath = async (sourceAsset: Asset, destAsset: Asset, amount: string): Promise<{ path: Asset[]; rate: string }> => {
  try {
    const result = await server.strictSendPaths(sourceAsset, amount, [destAsset]).call();
    if (result.records.length > 0) {
      const path = result.records[0].path.map((a: any) => new Asset(a.asset_code || "XLM", a.asset_issuer || undefined));
      const rate = result.records[0].destination_amount;
      return { path, rate };
    }
    return { path: [destAsset], rate: "0" };
  } catch {
    return { path: [destAsset], rate: "0" };
  }
};

export const swapXLM = async (sender: string, destAsset: Asset, destAmount: string): Promise<string> => {
  const account = await server.loadAccount(sender);
  const xlmAmount = (parseFloat(destAmount) * 1.02).toFixed(7);

  let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.pathPaymentStrictSend({
      sendAsset: Asset.native(), sendAmount: xlmAmount,
      destination: sender, destAsset, destMin: destAmount, path: [],
    }))
    .setTimeout(30).build();

  const simResult = await rpcServer.simulateTransaction(tx as any);
  if ((simResult as any).error) throw new Error("Swap simulation failed");

  tx = await rpcServer.prepareTransaction(tx) as any;

  const kp = getKeypair();
  tx.sign(kp);

  const result = await rpcServer.sendTransaction(tx as any);
  if (result.status === "ERROR") throw new Error("Swap failed");
  return result.hash;
};
