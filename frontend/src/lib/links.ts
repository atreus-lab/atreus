import { loadWallet } from "./wallet";
import { rpcServer } from "./stellar";
import { Contract, Address, xdr } from "@stellar/stellar-sdk";

export interface StoredLink {
  id: string;
  url: string;
  amount: string;
  secretHex: string;
  linkHashHex: string;
  createdAt: number;
  claimed: boolean;
}

const STORAGE_KEY = "atreus_links";

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

export function updateLinkStatus(secretHex: string, claimed: boolean): void {
  const wallet = loadWallet();
  if (!wallet) return;
  const links = getStoredLinks();
  const idx = links.findIndex(l => l.secretHex === secretHex);
  if (idx !== -1) {
    links[idx].claimed = claimed;
    localStorage.setItem(`${STORAGE_KEY}_${wallet.publicKey}`, JSON.stringify(links));
  }
}

// Check contract storage to determine if a link has been claimed.
async function checkLinkOnChain(linkHashHex: string): Promise<boolean | null> {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId || !linkHashHex) return null;
  try {
    const contract = new Contract(contractId);
    const key = xdr.ScVal.scvBytes(Buffer.from(linkHashHex, "hex"));
    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contract.address().toScAddress(),
        key,
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const entries = await rpcServer.getLedgerEntries(ledgerKey);
    if (!entries || entries.entries.length === 0) return null;
    const entry = entries.entries[0];
    const val = entry.val.contractData().val();

    // Try Vec format: [creator, amount, asset, policy_type, policy_params, expires_at, claimed]
    try {
      const vec = val.vec();
      if (vec && vec.length > 6) {
        const claimedField = vec[6];
        if (claimedField && claimedField.b() !== undefined) {
          return claimedField.b() === true;
        }
      }
    } catch {
      // Not a Vec, try Map format
    }

    // Try Map format: [{key: Symbol("claimed"), val: Bool}, ...]
    try {
      const map: any = val.map();
      if (map) {
        for (const entry of map) {
          const k: any = entry.key;
          const v: any = entry.val;
          if (k.sym && k.sym().toString() === "claimed" && v.b !== undefined) {
            return v.b() === true;
          }
        }
      }
    } catch {
      // Not a Map either
    }

    return null;
  } catch (err) {
    console.error("Failed to check link on-chain:", err);
    return null;
  }
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
