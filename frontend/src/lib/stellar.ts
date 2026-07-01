import { Horizon, Networks, TransactionBuilder, Asset, Contract, Address, nativeToScVal, xdr, rpc } from "@stellar/stellar-sdk";
import { signTransaction, requestAccess, isAllowed } from "@stellar/freighter-api";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const networkPassphrase = Networks.TESTNET;

export const nativeAsset = Asset.native();

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

  const tokenId = process.env.NEXT_PUBLIC_TOKEN_ID || "CDUMMYTOKENIDABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";

  const contract = new Contract(contractId);
  const amountStroops = BigInt(Math.floor(parseFloat(amount) * 10000000));
  const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

  const op = contract.call(
    "create_link",
    xdr.ScVal.scvBytes(Buffer.from(hash)),
    nativeToScVal(0, { type: 'u32' }), // policy_type (e.g. 0 for Secret)
    xdr.ScVal.scvBytes(Buffer.alloc(0)), // policy_params
    nativeToScVal(amountStroops, { type: 'i128' }),
    new Address(tokenId).toScVal(),
    nativeToScVal(expiry, { type: 'u64' }), // expiry
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
