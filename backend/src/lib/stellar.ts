import { Horizon, Networks, Asset, rpc, Contract, TransactionBuilder, Address, Keypair, xdr, nativeToScVal } from "@stellar/stellar-sdk";
import { Durability } from "@stellar/stellar-sdk/rpc";
import { emailHash, type BatchInputRow } from "./batch.js";

export const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const networkPassphrase = Networks.TESTNET;
export const nativeAsset = Asset.native();

/**
 * On-chain LinkInfo struct, mirrors `contracts/atreus-contract/src/lib.rs::LinkInfo`.
 * amount is stroops (i128) — convert to a human string at the route layer if needed.
 */
export interface LinkInfo {
  creator: string;
  amount: bigint;
  asset: string;
  policyType: number;
  policyParams: string; // hex
  expiresAt: bigint;
  claimed: boolean;
}

/** Decode an ScVal::I128 (lo/hi u64 pair) into a bigint. */
function extractI128(v: any): bigint | null {
  if (!v || v._arm !== "i128") return null;
  const parts = v._value;
  if (!parts || !parts._attributes) return null;
  const lo = parts._attributes.lo?._value;
  const hi = parts._attributes.hi?._value;
  if (lo === undefined || hi === undefined) return null;
  return (BigInt(hi) << BigInt(64)) + BigInt(lo);
}

/**
 * Read a LinkInfo from the AtreusContract's persistent storage. The contract has
 * no public getter, so we read the storage entry directly by the same key shape
 * `create_link` writes (BytesN<32> → ScVal.scvBytes). Returns null when the
 * entry does not exist or the RPC errors out.
 */
export const getLinkInfo = async (linkHashHex: string): Promise<LinkInfo | null> => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");
  if (!/^[0-9a-fA-F]{64}$/.test(linkHashHex)) throw new Error("linkHash must be 64 hex chars");

  const key = xdr.ScVal.scvBytes(Buffer.from(linkHashHex, "hex"));
  let entry: any;
  try {
    entry = await rpcServer.getContractData(contractId, key, Durability.Persistent);
  } catch (err: any) {
    if (err?.status === 404 || err?.response?.status === 404) return null;
    throw err;
  }
  if (!entry) return null;

  const val = entry.val.contractData().val();
  const map: any = (() => { try { return val.map(); } catch { return null; } })();
  if (!map) return null;

  const out: Partial<LinkInfo> = {};
  for (let i = 0; i < map.length; i++) {
    const kv: any = map[i];
    const attrs = kv._attributes || kv;
    const k: any = attrs.key;
    const v: any = attrs.val;
    if (!k || k._arm !== "sym") continue;
    const field = Buffer.from(k._value).toString("utf8");
    if (field === "claimed" && v?._arm === "b") out.claimed = v._value === true;
    else if (field === "creator" && v) {
      try { out.creator = Address.fromScVal(v).toString(); } catch { /* malformed */ }
    } else if (field === "asset" && v) {
      try { out.asset = Address.fromScVal(v).toString(); } catch { /* malformed */ }
    } else if (field === "amount" && v) {
      const n = extractI128(v);
      if (n !== null) out.amount = n;
    } else if (field === "policy_type" && v) {
      if (v._arm === "u32") out.policyType = Number(v._value);
    } else if (field === "policy_params" && v?._arm === "bytes") {
      out.policyParams = Buffer.from(v._value).toString("hex");
    } else if (field === "expires_at" && v) {
      if (v._arm === "u64") out.expiresAt = BigInt(v._value);
    }
  }
  if (out.creator === undefined || out.amount === undefined || out.asset === undefined ||
      out.policyType === undefined || out.policyParams === undefined || out.expiresAt === undefined ||
      out.claimed === undefined) {
    return null;
  }
  return out as LinkInfo;
};

export const createBatchEscrowTransaction = async (
  creator: string,
  row: BatchInputRow,
  linkHash: Uint8Array,
): Promise<string> => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  const tokenId = process.env.NEXT_PUBLIC_TOKEN_ID;
  const creatorSecret = process.env.BATCH_CREATOR_SECRET_KEY;
  if (!contractId || !tokenId || !creatorSecret) throw new Error("Batch escrow configuration is incomplete");
  const keypair = Keypair.fromSecret(creatorSecret);
  if (keypair.publicKey() !== creator) throw new Error("Configured batch signer does not match creator");
  const amountParts = row.amount.split(".");
  const stroops = BigInt(amountParts[0]) * 10_000_000n + BigInt((amountParts[1] || "").padEnd(7, "0"));
  const recipientHash = emailHash(row.email);
  const contract = new Contract(contractId);
  const operation = contract.call(
    "create_link",
    xdr.ScVal.scvBytes(Buffer.from(linkHash)),
    nativeToScVal(recipientHash ? 1 : 0, { type: "u32" }),
    xdr.ScVal.scvBytes(Buffer.from(recipientHash ?? new Uint8Array())),
    nativeToScVal(stroops, { type: "i128" }),
    new Address(tokenId).toScVal(),
    nativeToScVal(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, { type: "u64" }),
    new Address(creator).toScVal(),
  );
  const account = await rpcServer.getAccount(creator);
  let transaction = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(operation).setTimeout(120).build();
  transaction = await rpcServer.prepareTransaction(transaction) as any;
  transaction.sign(keypair);
  const submitted = await rpcServer.sendTransaction(transaction as any);
  if (submitted.status === "ERROR") throw new Error(`Transaction rejected: ${(submitted as any).errorResultXdr || "RPC error"}`);
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    const result = await rpcServer.getTransaction(submitted.hash);
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return submitted.hash;
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`Transaction failed: ${submitted.hash}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`RPC timeout waiting for ${submitted.hash}`);
};

/**
 * Submits VerifierContract.attest(attester, link_hash, recipient) signed by the
 * backend's dedicated attester keypair. Called only after verifyClaimProof() confirms
 * the real UltraHonk proof is valid for this exact (secret, recipient) pair.
 */
export const submitAttestation = async (linkHash: Uint8Array, recipient: string): Promise<string> => {
  const verifierContractId = process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID;
  if (!verifierContractId) throw new Error("NEXT_PUBLIC_VERIFIER_CONTRACT_ID is not configured");

  const attesterSecret = process.env.ATTESTER_SECRET_KEY;
  if (!attesterSecret) throw new Error("ATTESTER_SECRET_KEY is not configured");

  const attesterKp = Keypair.fromSecret(attesterSecret);
  const contract = new Contract(verifierContractId);

  const op = contract.call(
    "attest",
    new Address(attesterKp.publicKey()).toScVal(),
    xdr.ScVal.scvBytes(Buffer.from(linkHash)),
    new Address(recipient).toScVal(),
  );

  const account = await rpcServer.getAccount(attesterKp.publicKey());
  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op)
    .setTimeout(60)
    .build();

  tx = (await rpcServer.prepareTransaction(tx)) as any;
  tx.sign(attesterKp);

  const sendResult = await rpcServer.sendTransaction(tx as any);
  if (sendResult.status === "ERROR") {
    throw new Error(`Attestation tx rejected: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const result = await rpcServer.getTransaction(sendResult.hash);
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return sendResult.hash;
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Attestation tx failed on-chain (hash: ${sendResult.hash})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for attestation tx (hash: ${sendResult.hash})`);
};
