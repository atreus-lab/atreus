import { Horizon, Networks, TransactionBuilder, Asset, Contract, Address, nativeToScVal, xdr, rpc, Keypair, BASE_FEE, Operation, Memo } from "@stellar/stellar-sdk";
import { signTransaction, requestAccess, isAllowed } from "@stellar/freighter-api";

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
  if (!(await isAllowed())) {
    await requestAccess();
  }
  const { address } = await requestAccess();
  if (!address) throw new Error("Wallet not connected");
  return address;
};

export const createEscrowTx = async (creator: string, amount: string, hash: Uint8Array) => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");
  }

  const tokenId = process.env.NEXT_PUBLIC_TOKEN_ID;
  if (!tokenId) {
    throw new Error("NEXT_PUBLIC_TOKEN_ID is not configured");
  }

  const contract = new Contract(contractId);
  const amountStroops = BigInt(Math.floor(parseFloat(amount) * 10000000));
  const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

  const op = contract.call(
    "create_link",
    xdr.ScVal.scvBytes(Buffer.from(hash)),
    nativeToScVal(0, { type: 'u32' }),
    xdr.ScVal.scvBytes(Buffer.from(new Uint8Array(0))),
    nativeToScVal(amountStroops, { type: 'i128' }),
    new Address(tokenId).toScVal(),
    nativeToScVal(expiry, { type: 'u64' }),
    new Address(creator).toScVal()
  );

  const account = await rpcServer.getAccount(creator);

  let tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(120)
    .build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signedXdr.error) {
    throw new Error(signedXdr.error);
  }

  const txToSubmit = TransactionBuilder.fromXDR(signedXdr.signedTxXdr as string, networkPassphrase);
  const sendResult = await rpcServer.sendTransaction(txToSubmit as any);

  if (sendResult.status === "ERROR") {
    throw new Error(`Tx submission failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  return sendResult.hash;
};

export const claimLinkTx = async (recipient: string, linkHash: Uint8Array, secret: Uint8Array) => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");
  }

  const contract = new Contract(contractId);

  const op = contract.call(
    "claim_link",
    xdr.ScVal.scvBytes(Buffer.from(linkHash)),
    new Address(recipient).toScVal(),
    xdr.ScVal.scvBytes(Buffer.from(secret)),
  );

  const account = await rpcServer.getAccount(recipient);

  let tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(120)
    .build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signedXdr.error) {
    throw new Error(signedXdr.error);
  }

  const txToSubmit = TransactionBuilder.fromXDR(signedXdr.signedTxXdr as string, networkPassphrase);
  const sendResult = await rpcServer.sendTransaction(txToSubmit as any);

  if (sendResult.status === "ERROR") {
    throw new Error(`Tx submission failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  return sendResult.hash;
};

export const submitProofTx = async (recipient: string, proofBytes: Uint8Array) => {
  const contractId = process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID;
  if (!contractId) {
    throw new Error("NEXT_PUBLIC_VERIFIER_CONTRACT_ID is not configured");
  }

  const contract = new Contract(contractId);

  const op = contract.call(
    "submit_proof",
    new Address(recipient).toScVal(),
    xdr.ScVal.scvBytes(Buffer.from(proofBytes)),
  );

  const account = await rpcServer.getAccount(recipient);

  let tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(120)
    .build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signedXdr.error) {
    throw new Error(signedXdr.error);
  }

  const txToSubmit = TransactionBuilder.fromXDR(signedXdr.signedTxXdr as string, networkPassphrase);
  const sendResult = await rpcServer.sendTransaction(txToSubmit as any);

  if (sendResult.status === "ERROR") {
    throw new Error(`Tx submission failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  return sendResult.hash;
};

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

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.payment({
      destination,
      asset: Asset.native(),
      amount: amount,
    }))
    .setTimeout(30)
    .build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signedXdr.error) throw new Error(signedXdr.error);

  const txToSubmit = TransactionBuilder.fromXDR(signedXdr.signedTxXdr as string, networkPassphrase);
  const result = await rpcServer.sendTransaction(txToSubmit as any);
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
  const xlmAmount = (parseFloat(destAmount) * 1.02).toFixed(7); // 2% slippage buffer

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(Operation.pathPaymentStrictSend({
      sendAsset: Asset.native(),
      sendAmount: xlmAmount,
      destination: sender,
      destAsset,
      destMin: destAmount,
      path: [],
    }))
    .setTimeout(30)
    .build();

  const simResult = await rpcServer.simulateTransaction(tx as any);
  if ((simResult as any).error) throw new Error("Swap simulation failed");

  tx = await rpcServer.prepareTransaction(tx) as any;
  const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signedXdr.error) throw new Error(signedXdr.error);

  const txToSubmit = TransactionBuilder.fromXDR(signedXdr.signedTxXdr as string, networkPassphrase);
  const result = await rpcServer.sendTransaction(txToSubmit as any);
  if (result.status === "ERROR") throw new Error("Swap failed");

  return result.hash;
};
