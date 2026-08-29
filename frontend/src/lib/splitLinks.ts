import { TransactionBuilder, Contract, Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { getActiveWalletProvider } from "./wallet";
import { rpcServer, networkPassphrase, waitForTransaction, xlmToStroops } from "./stellar";

// Split links (#120): multi-recipient / partial-claim escrow. See
// docs/architecture.md §5.1 and contracts/atreus-contract/src/lib.rs for the
// on-chain state machine. Unlike the single-shot create_link/claim_link flow,
// recipients are named Stellar Addresses at creation time, so claim_split
// needs no ZK proof round-trip for the default (non-email-restricted) policy
// — recipient.require_auth() alone gates the claim.

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const ZERO_SALT = new Uint8Array(32);

export interface SplitRecipientInput {
  address: string;
  /** Human-readable amount, e.g. "12.5" (XLM). */
  amount: string;
}

export interface SplitRecipientStatus {
  address: string;
  allocated: string; // stroops
  claimed: string; // stroops
}

export interface SplitLinkStatus {
  id: string;
  amount: string; // stroops
  asset: string;
  policyType: number;
  policyParams: string;
  expiresAt: string;
  minClaimBps: number;
  closed: boolean;
  recipients: SplitRecipientStatus[];
}

function randomId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Funds a split link: escrows sum(amounts) and allocates one share per
 * recipient. A single recipient is the "partial claims" mode (#120); several
 * is "split recipients" mode. `minClaimBps` floors non-final partial claims
 * as basis points of each recipient's own allocation — 0 disables the floor.
 */
export const createSplitLinkTx = async (
  creator: string,
  recipients: SplitRecipientInput[],
  expiry: number,
  minClaimBps: number = 0,
  recipientEmailHash?: Uint8Array,
): Promise<{ id: string; txHash: string }> => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");
  const tokenId = process.env.NEXT_PUBLIC_TOKEN_ID;
  if (!tokenId) throw new Error("NEXT_PUBLIC_TOKEN_ID is not configured");

  if (recipients.length === 0) throw new Error("At least one recipient is required");
  if (recipients.length > 50) throw new Error("A split link supports at most 50 recipients");

  const seen = new Set<string>();
  for (const r of recipients) {
    if (seen.has(r.address)) throw new Error(`Duplicate recipient: ${r.address}`);
    seen.add(r.address);
    if (!(parseFloat(r.amount) > 0)) throw new Error(`Invalid amount for ${r.address}`);
  }

  const idBytes = randomId();
  const id = bytesToHex(idBytes);

  const hasEmailRestriction = recipientEmailHash && recipientEmailHash.length === 32;
  const policyType = hasEmailRestriction ? 1 : 0;
  const policyParams = hasEmailRestriction ? recipientEmailHash! : new Uint8Array(0);

  const contract = new Contract(contractId);
  const op = contract.call(
    "create_split_link",
    xdr.ScVal.scvBytes(Buffer.from(idBytes)),
    nativeToScVal(policyType, { type: "u32" }),
    xdr.ScVal.scvBytes(Buffer.from(policyParams)),
    new Address(tokenId).toScVal(),
    nativeToScVal(expiry, { type: "u64" }),
    new Address(creator).toScVal(),
    xdr.ScVal.scvVec(recipients.map((r) => new Address(r.address).toScVal())),
    xdr.ScVal.scvVec(recipients.map((r) => nativeToScVal(xlmToStroops(r.amount), { type: "i128" }))),
    nativeToScVal(minClaimBps, { type: "u32" }),
  );

  let account;
  try {
    account = await rpcServer.getAccount(creator);
  } catch {
    throw new Error("Could not load your account. Make sure it's funded on testnet.");
  }

  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op)
    .setTimeout(120)
    .build();

  tx = (await rpcServer.prepareTransaction(tx)) as any;

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const sendResult = await rpcServer.sendTransaction(signedTx as any);
  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction rejected: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  await waitForTransaction(sendResult.hash);
  return { id, txHash: sendResult.hash };
};

/**
 * Claims up to `claimAmount` (XLM) from `recipient`'s allocation. For a link
 * with no email restriction, `claimSalt` is unused on-chain and defaults to
 * 32 zero bytes; for an email-restricted link, pass the `claimSalt` returned
 * by POST /api/links/split/:id/attest-email.
 *
 * `claimAmount` and `relayerFee` are both human-readable XLM strings, unlike
 * `claimLinkTx`'s `relayerFee` (raw stroops) — claim_split's fee is deducted
 * from this specific claim rather than the link's fixed total, so keeping
 * both amounts in the same unit here is less error-prone for callers.
 */
export const claimSplitTx = async (
  recipient: string,
  id: string,
  claimAmount: string,
  claimSalt: Uint8Array = ZERO_SALT,
  relayerAddress?: string,
  relayerFee?: string,
): Promise<string> => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");
  if (claimSalt.length !== 32) throw new Error("Invalid claim salt: expected 32 bytes");

  let account;
  try {
    account = await rpcServer.getAccount(recipient);
  } catch {
    throw new Error("Recipient account isn't funded on testnet — fund it first via friendbot.");
  }

  const contract = new Contract(contractId);
  const op = contract.call(
    "claim_split",
    xdr.ScVal.scvBytes(Buffer.from(id, "hex")),
    new Address(recipient).toScVal(),
    nativeToScVal(xlmToStroops(claimAmount), { type: "i128" }),
    xdr.ScVal.scvBytes(Buffer.from(claimSalt)),
    new Address(relayerAddress ?? recipient).toScVal(),
    nativeToScVal(relayerFee ? xlmToStroops(relayerFee) : BigInt(0), { type: "i128" }),
  );

  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op)
    .setTimeout(120)
    .build();

  tx = (await rpcServer.prepareTransaction(tx)) as any;

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const sendResult = await rpcServer.sendTransaction(signedTx as any);
  if (sendResult.status === "ERROR") {
    throw new Error(`Claim failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  await waitForTransaction(sendResult.hash);
  return sendResult.hash;
};

/** Creator-only clawback of every recipient's unclaimed remainder, only before expiry. */
export const cancelSplitLinkTx = async (creator: string, id: string): Promise<string> => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");

  const account = await rpcServer.getAccount(creator);
  const contract = new Contract(contractId);
  const op = contract.call("cancel_split_link", xdr.ScVal.scvBytes(Buffer.from(id, "hex")));

  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op)
    .setTimeout(120)
    .build();
  tx = (await rpcServer.prepareTransaction(tx)) as any;

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const sendResult = await rpcServer.sendTransaction(signedTx as any);
  if (sendResult.status === "ERROR") {
    throw new Error(`Cancel failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  await waitForTransaction(sendResult.hash);
  return sendResult.hash;
};

/** Creator-only sweep of the unclaimed remainder after expiry — the split-link analogue of refund_link. */
export const refundSplitLinkTx = async (creator: string, id: string): Promise<string> => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");

  const account = await rpcServer.getAccount(creator);
  const contract = new Contract(contractId);
  const op = contract.call("refund_split_link", xdr.ScVal.scvBytes(Buffer.from(id, "hex")));

  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op)
    .setTimeout(120)
    .build();
  tx = (await rpcServer.prepareTransaction(tx)) as any;

  const provider = getActiveWalletProvider();
  const signedXdr = await provider.signTransaction(tx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const sendResult = await rpcServer.sendTransaction(signedTx as any);
  if (sendResult.status === "ERROR") {
    throw new Error(`Refund failed: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
  }

  await waitForTransaction(sendResult.hash);
  return sendResult.hash;
};

/** Reads split-link status (recipients, allocations, claimed amounts, closed state) via the backend. */
export const getSplitLinkStatus = async (id: string): Promise<SplitLinkStatus | null> => {
  const response = await fetch(`${backendUrl}/api/links/split/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Failed to load split link");
  return body;
};

/** Requests the DKIM-backed email attestation an email-restricted split link needs before claiming. */
export const attestSplitEmail = async (
  id: string,
  recipient: string,
  recipientEmailHash: string,
): Promise<{ claimSalt: string }> => {
  const response = await fetch(`${backendUrl}/api/links/split/${encodeURIComponent(id)}/attest-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Correlation-ID": crypto.randomUUID() },
    body: JSON.stringify({ recipient, recipient_email_hash: recipientEmailHash }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Failed to attest email");
  return body;
};
