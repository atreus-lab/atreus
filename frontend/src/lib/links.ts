import { loadWallet, getKeypair } from "./wallet";
import { rpcServer, networkPassphrase, waitForTransaction } from "./stellar";
import { xdr, TransactionBuilder, Contract, Address } from "@stellar/stellar-sdk";
import { Durability } from "@stellar/stellar-sdk/rpc";

export interface StoredLink {
  id: string;
  url: string;
  amount: string;
  secretHex: string;
  linkHashHex: string;
  createdAt: number;
  expiresAt: number;
  claimed: boolean;
  txHash?: string;
}

export interface BatchRowResult {
  row: number;
  amount: string;
  email?: string;
  memo?: string;
  status: "pending" | "processing" | "success" | "failed";
  url?: string;
  txHash?: string;
  error?: string;
  attempts?: number;
}

export interface BatchProgressData {
  id: string;
  status: "queued" | "processing" | "completed";
  totalAmount: string;
  successCount: number;
  failureCount: number;
  rows: BatchRowResult[];
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export async function createBatchLinks(csv: string, creator: string): Promise<{ batchId: string }> {
  const response = await fetch(`${backendUrl}/api/links/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Correlation-ID": crypto.randomUUID() },
    body: JSON.stringify({ csv, creator }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Failed to create batch");
  return body;
}

export async function getBatchProgress(batchId: string): Promise<BatchProgressData> {
  const response = await fetch(`${backendUrl}/api/links/batch/${encodeURIComponent(batchId)}`, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Failed to load batch progress");
  return body;
}

export function getBatchResultsUrl(batchId: string): string {
  return `${backendUrl}/api/links/batch/${encodeURIComponent(batchId)}/results.csv`;
}

const STORAGE_KEY = "atreus_links";
const RECEIVED_STORAGE_KEY = "atreus_received";

export function getStoredLinks(): StoredLink[] {
  if (typeof window === "undefined") return [];
  const wallet = loadWallet();
  if (!wallet) return [];
  const raw = localStorage.getItem(`${STORAGE_KEY}_${wallet.publicKey}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLink(link: StoredLink): void {
  const wallet = loadWallet();
  if (!wallet) return;
  const links = getStoredLinks();
  links.unshift(link);
  localStorage.setItem(`${STORAGE_KEY}_${wallet.publicKey}`, JSON.stringify(links));
}

export function updateLinkStatus(secretHex: string, claimed: boolean, txHash?: string): void {
  const wallet = loadWallet();
  if (!wallet) return;
  const links = getStoredLinks();
  const idx = links.findIndex(l => l.secretHex === secretHex);
  if (idx !== -1) {
    links[idx].claimed = claimed;
    if (txHash) links[idx].txHash = txHash;
    localStorage.setItem(`${STORAGE_KEY}_${wallet.publicKey}`, JSON.stringify(links));
  }
}

// Save a claimed link to the *recipient's* storage so they can see it on their dashboard.
export function saveClaimedLink(link: StoredLink): void {
  const wallet = loadWallet();
  if (!wallet) return;
  const links = getClaimedLinks();
  links.unshift(link);
  localStorage.setItem(`${RECEIVED_STORAGE_KEY}_${wallet.publicKey}`, JSON.stringify(links));
}

// Get links the current user has claimed (as recipient).
export function getClaimedLinks(): StoredLink[] {
  if (typeof window === "undefined") return [];
  const wallet = loadWallet();
  if (!wallet) return [];
  const raw = localStorage.getItem(`${RECEIVED_STORAGE_KEY}_${wallet.publicKey}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Try to extract a native number from an i128 XDR internal representation. */
function extractI128(v: any): bigint | null {
  try {
    if (!v || v._arm !== 'i128') return null;
    const parts = v._value;
    if (!parts || !parts._attributes) return null;
    const lo = parts._attributes.lo?._value;
    const hi = parts._attributes.hi?._value;
    if (lo === undefined || hi === undefined) return null;
    const loBig = BigInt(lo);
    const hiBig = BigInt(hi);
    return (hiBig << BigInt(64)) + loBig;
  } catch {
    return null;
  }
}

/**
 * Read link info (claimed status + amount) from the contract.
 * Returns { claimed, amount } where amount is in XLM as a string, or null for both if unreadable.
 */
export async function readLinkInfo(linkHashHex: string): Promise<{ claimed: boolean | null; amount: string | null }> {
  const result: { claimed: boolean | null; amount: string | null } = { claimed: null, amount: null };
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId || !linkHashHex) return result;
  try {
    const key = xdr.ScVal.scvBytes(Buffer.from(linkHashHex, "hex"));
    const entry = await rpcServer.getContractData(contractId, key, Durability.Persistent);
    if (!entry) return result;
    const val = entry.val.contractData().val();

    // Try Map format — Soroban stores #[contracttype] structs as ScMap with Symbol keys
    try {
      const map: any = val.map();
      if (map) {
        for (let i = 0; i < map.length; i++) {
          const entry: any = map[i];
          const attrs = entry._attributes || entry;
          const k: any = attrs.key;
          const v: any = attrs.val;
          if (k && k._arm === 'sym') {
            const fieldName = Buffer.from(k._value).toString('utf8');
            if (fieldName === 'claimed' && v && v._arm === 'b') {
              result.claimed = v._value === true;
            } else if (fieldName === 'amount' && v) {
              const i128 = extractI128(v);
              if (i128 !== null) {
                // Convert stroops to XLM (1 XLM = 10,000,000 stroops)
                const xlm = Number(i128) / 10_000_000;
                result.amount = xlm.toFixed(7).replace(/\.?0+$/, '');
              }
            }
          }
        }
      }
    } catch {
      // Not a Map
    }

    return result;
  } catch (err: any) {
    if (err?.status === 404) return result;
    console.error("Failed to read link info:", err);
    return result;
  }
}

// Check contract storage to determine if a link has been claimed.
export async function checkLinkOnChain(linkHashHex: string): Promise<boolean | null> {
  const info = await readLinkInfo(linkHashHex);
  return info.claimed;
}

// Refresh all stored links' claimed status from the chain.
export async function refreshLinkStatuses(): Promise<void> {
  const wallet = loadWallet();
  if (!wallet) return;
  const links = getStoredLinks();
  let changed = false;
  for (const link of links) {
    if (!link.claimed) {
      const claimed = await checkLinkOnChain(link.linkHashHex);
      if (claimed === true) {
        link.claimed = true;
        changed = true;
      }
    }
  }
  if (changed) {
    localStorage.setItem(`${STORAGE_KEY}_${wallet.publicKey}`, JSON.stringify(links));
  }
}

export async function refundLink(linkHashHex: string): Promise<string> {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured");

  const wallet = loadWallet();
  if (!wallet) throw new Error("No wallet found");

  const contract = new Contract(contractId);
  const op = contract.call(
    "refund_link",
    xdr.ScVal.scvBytes(Buffer.from(linkHashHex, "hex")),
  );

  const account = await rpcServer.getAccount(wallet.publicKey);
  let tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
    .addOperation(op).setTimeout(120).build();

  tx = await rpcServer.prepareTransaction(tx) as any;

  const kp = getKeypair();
  tx.sign(kp);

  const sendResult = await rpcServer.sendTransaction(tx as any);
  if (sendResult.status === "ERROR") {
    throw new Error(`Refund failed: ${(sendResult as any).errorResultXdr || "unknown error"}`);
  }

  await waitForTransaction(sendResult.hash);
  return sendResult.hash;
}

export function refundStoredLink(secretHex: string): void {
  const wallet = loadWallet();
  if (!wallet) return;
  const links = getStoredLinks();
  const idx = links.findIndex(l => l.secretHex === secretHex);
  if (idx !== -1) {
    links.splice(idx, 1);
    localStorage.setItem(`${STORAGE_KEY}_${wallet.publicKey}`, JSON.stringify(links));
  }
}
