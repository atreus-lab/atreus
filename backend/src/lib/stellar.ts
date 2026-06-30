import { Horizon, Networks, Asset } from "@stellar/stellar-sdk";

export const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const networkPassphrase = Networks.TESTNET;
export const nativeAsset = Asset.native();
