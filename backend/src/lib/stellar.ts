import { Horizon, Networks, Asset, rpc, Contract, TransactionBuilder, Address, Keypair, xdr, nativeToScVal } from "@stellar/stellar-sdk";
import { emailHash, type BatchInputRow } from "./batch.js";

export const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const networkPassphrase = Networks.TESTNET;
export const nativeAsset = Asset.native();

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
 *
 * If emailHash is provided (when policy_type == 1), also submits
 * VerifierContract.attest_email(attester, link_hash, recipient, email_hash).
 */
// VerifierContract that the AtreusContract (CAITLKEO4YJ5HQR6DORTWX5RAVD5XLSHCPWIOZIWSQF6CSNJIPXOQKT2)
// was deployed with. This MUST match or the attestation won't be found by claim_link.
// The env var is checked first for flexibility; this hardcoded fallback ensures the
// correct contract is used even if Vercel env vars are misconfigured.
const DEFAULT_VERIFIER_CONTRACT_ID =
  "CA3WA53LKQEJH3L3FSLFOUBOB3DG7D4IHEE4GEMM35WC5Z5YWDN264DB";

export const submitAttestation = async (
  linkHash: Uint8Array,
  recipient: string,
  emailHash?: Uint8Array
): Promise<string> => {
  const verifierContractId =
    process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID || DEFAULT_VERIFIER_CONTRACT_ID;

  const attesterSecret = process.env.ATTESTER_SECRET_KEY;
  if (!attesterSecret) throw new Error("ATTESTER_SECRET_KEY is not configured");

  const attesterKp = Keypair.fromSecret(attesterSecret);
  const contract = new Contract(verifierContractId);

  // Build operations: always attest the ZK proof binding
  const ops = [
    contract.call(
      "attest",
      new Address(attesterKp.publicKey()).toScVal(),
      xdr.ScVal.scvBytes(Buffer.from(linkHash)),
      new Address(recipient).toScVal(),
    ),
  ];

  // If email hash is provided, also attest the email binding
  if (emailHash && emailHash.length === 32) {
    ops.push(
      contract.call(
        "attest_email",
        new Address(attesterKp.publicKey()).toScVal(),
        xdr.ScVal.scvBytes(Buffer.from(linkHash)),
        new Address(recipient).toScVal(),
        xdr.ScVal.scvBytes(Buffer.from(emailHash)),
      )
    );
  }

  const account = await rpcServer.getAccount(attesterKp.publicKey());
  let builder = new TransactionBuilder(account, { fee: "200000", networkPassphrase });
  for (const op of ops) {
    builder = builder.addOperation(op);
  }
  let tx = builder.setTimeout(60).build();

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
