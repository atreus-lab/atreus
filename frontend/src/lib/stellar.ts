import { Horizon, Networks, TransactionBuilder, Asset, Contract, Address, nativeToScVal, xdr, rpc } from "@stellar/stellar-sdk";
import { signTransaction, requestAccess } from "@stellar/freighter-api";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const networkPassphrase = Networks.TESTNET;

export const nativeAsset = Asset.native();

export const connectWallet = async (): Promise<string> => {
  const { address } = await requestAccess();
  if (!address) throw new Error("Wallet not connected");
  return address;
};

/**
 * Converts a decimal XLM amount string into stroops (1 XLM = 10,000,000 stroops)
 * using string/BigInt math to avoid floating point rounding errors.
 */
export const xlmToStroops = (amount: string): bigint => {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(trimmed)) {
    throw new Error("Invalid amount: use up to 7 decimal places");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const paddedFrac = frac.padEnd(7, "0");
  return BigInt(whole) * BigInt(10000000) + BigInt(paddedFrac || "0");
};

/**
 * Polls the Soroban RPC for the final result of a submitted transaction.
 * sendTransaction() only confirms the tx was accepted into the mempool (PENDING) —
 * it does NOT mean the tx succeeded. We must poll getTransaction() until it
 * resolves to SUCCESS or FAILED before telling the user the link is ready.
 */
export const waitForTransaction = async (
  hash: string,
  { timeoutMs = 30_000, intervalMs = 1500 }: { timeoutMs?: number; intervalMs?: number } = {}
) => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await rpcServer.getTransaction(hash);

    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return result;
    }

    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Transaction failed on-chain (hash: ${hash}). It may have reverted due to a contract error or insufficient balance.`
      );
    }

    // NOT_FOUND means still pending / not yet indexed — keep polling
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out waiting for transaction confirmation (hash: ${hash}). Check the explorer to confirm its final status.`
  );
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
  const amountStroops = xlmToStroops(amount);
  const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

  const op = contract.call(
    "create_link",
    xdr.ScVal.scvBytes(hash),
    nativeToScVal(0, { type: 'u32' }),
    xdr.ScVal.scvBytes(new Uint8Array(0)),
    nativeToScVal(amountStroops, { type: 'i128' }),
    new Address(tokenId).toScVal(),
    nativeToScVal(expiry, { type: 'u64' }),
    new Address(creator).toScVal()
  );

  let account;
  try {
    account = await rpcServer.getAccount(creator);
  } catch (err) {
    throw new Error("Could not load your account from the Stellar network. Make sure your wallet is funded on testnet.");
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

  const signedXdr = await signTransaction(tx.toXDR(), { networkPassphrase });
  if (signedXdr.error) {
    throw new Error(signedXdr.error);
  }

  const txToSubmit = TransactionBuilder.fromXDR(signedXdr.signedTxXdr as string, networkPassphrase);

  let sendResult;
  try {
    sendResult = await rpcServer.sendTransaction(txToSubmit as any);
  } catch (err: any) {
    throw new Error(`Could not reach the Stellar network: ${err?.message || err}`);
  }

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction rejected: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  // Wait for on-chain confirmation before returning — this is the step that was missing.
  await waitForTransaction(sendResult.hash);

  return sendResult.hash;
};