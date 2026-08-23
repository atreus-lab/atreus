import { Networks, TransactionBuilder, Asset, Contract, Address, nativeToScVal, xdr, rpc, BASE_FEE, Operation } from "@stellar/stellar-sdk";
import { getActiveWalletProvider, getActivePublicKey } from "./wallet";

export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
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
  return await getActivePublicKey();
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

export const DEFAULT_CONTRACT_ID = "CCTDH7A7F5SCJ2WA6I5ZC6MDJDR6D7R52PDYRRTHBMNWOSZREVV2HY2N";
export const DEFAULT_VERIFIER_CONTRACT_ID = "CD5UQT5ESDK5C3VNWDW7LZJAJJQIF2HGOVZJMHGFX4O32PATGSVZCRAL";
export const DEFAULT_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const createEscrowTx = async (creator: string, amount: string, hash: Uint8Array, expiry?: number, recipientEmailHash?: Uint8Array) => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || DEFAULT_CONTRACT_ID;
  const tokenId = process.env.NEXT_PUBLIC_TOKEN_ID || DEFAULT_TOKEN_ID;

  const balance = await getNativeBalance(creator);
  const amountNum = parseFloat(balance);
  const requestedNum = parseFloat(amount);
  const estimatedFee = 0.01; // 100,000 stroops
  if (amountNum < requestedNum + estimatedFee) {
    throw new Error(
      `Insufficient balance: you have ${balance} XLM but need at least ${(requestedNum + estimatedFee).toFixed(7)} XLM (${amount} + fees)`
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

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  let sendResult;
  try {
    sendResult = await rpcServer.sendTransaction(signedTx as any);
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
  claimSalt: Uint8Array,
  relayerAddress?: string,
  relayerFee?: string,
) => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || DEFAULT_CONTRACT_ID;
  if (claimSalt.length !== 32) throw new Error("Invalid claim salt: expected 32 bytes");

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
    xdr.ScVal.scvBytes(Buffer.from(claimSalt)),
    new Address(relayerAddress ?? recipient).toScVal(),
    nativeToScVal(BigInt(relayerFee ?? '0'), { type: 'i128' }),
  );

  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op).setTimeout(120).build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const sendResult = await rpcServer.sendTransaction(signedTx as any);

  if (sendResult.status === "ERROR") {
    throw new Error(`Tx submission failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }
  return sendResult.hash;
};

export const getAccountBalances = async (address: string): Promise<Balance[]> => {
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
};

export const getNativeBalance = async (address: string): Promise<string> => {
  const balances = await getAccountBalances(address);
  const native = balances.find(b => b.asset_type === "native");
  return native?.balance || "0";
};

export const getRecentTransactions = async (address: string, limit = 10): Promise<Transaction[]> => {
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
};

async function waitForTx(hash: string, timeoutMs = 25000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const tx = await rpcServer.getTransaction(hash);
      if (tx.status === "SUCCESS") return;
      if (tx.status === "FAILED") {
        throw new Error(`Transaction failed on ledger (${hash.slice(0, 8)}...)`);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("failed on ledger")) throw err;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("Transaction confirmation timed out on network");
}

export const sendXLM = async (sender: string, destination: string, amount: string): Promise<string> => {
  const account = await rpcServer.getAccount(sender);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.payment({ destination, asset: Asset.native(), amount }))
    .setTimeout(30).build();

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const result = await rpcServer.sendTransaction(signedTx as any);
  if (result.status === "ERROR") throw new Error("Transaction failed");
  await waitForTx(result.hash);
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

export const findSwapPath = async (_sourceAsset: Asset, destAsset: Asset, amount: string): Promise<{ path: Asset[]; rate: string }> => {
  try {
    const rate = (parseFloat(amount || "0") * 0.98).toFixed(7);
    return { path: [destAsset], rate };
  } catch {
    return { path: [destAsset], rate: "0" };
  }
};

export const swapXLM = async (sender: string, destAsset: Asset, destAmount: string): Promise<string> => {
  const account = await rpcServer.getAccount(sender);
  const xlmAmount = (parseFloat(destAmount) * 1.02).toFixed(7);

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.pathPaymentStrictSend({
      sendAsset: Asset.native(), sendAmount: xlmAmount,
      destination: sender, destAsset, destMin: destAmount, path: [],
    }))
    .setTimeout(30).build();

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const result = await rpcServer.sendTransaction(signedTx as any);
  if (result.status === "ERROR") throw new Error("Swap failed");
  await waitForTx(result.hash);
  return result.hash;
};
