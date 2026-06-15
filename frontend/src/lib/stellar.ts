import { Horizon, Networks, TransactionBuilder, Asset } from "@stellar/stellar-sdk";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const networkPassphrase = Networks.TESTNET;

export const nativeAsset = Asset.native();

export const createEscrowTx = async (creator: string, amount: string, hash: string) => {
  // Logic to build and sign transaction for PayLinkContract.create_link
  console.log("Creating escrow for", amount, "XLM with hash", hash);
};
