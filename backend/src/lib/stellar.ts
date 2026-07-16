import { Horizon, Networks, Asset, rpc, Contract, TransactionBuilder, Address, Keypair, xdr } from "@stellar/stellar-sdk";

export const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const server = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);
export const networkPassphrase = Networks.TESTNET;
export const nativeAsset = Asset.native();

/**
 * Submits VerifierContract.attest(attester, link_hash, recipient) signed by the
 * backend's dedicated attester keypair. Called only after verifyClaimProof() confirms
 * the real UltraHonk proof is valid for this exact (secret, recipient) pair.
 *
 * If emailHash is provided (when policy_type == 1), also submits
 * VerifierContract.attest_email(attester, link_hash, recipient, email_hash).
 */
export const submitAttestation = async (
  linkHash: Uint8Array,
  recipient: string,
  emailHash?: Uint8Array
): Promise<string> => {
  const verifierContractId = process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID;
  if (!verifierContractId) throw new Error("NEXT_PUBLIC_VERIFIER_CONTRACT_ID is not configured");

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
