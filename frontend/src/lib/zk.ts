/**
 * frontend/src/lib/zk.ts — Client-side ZK proof generation for the claim flow.
 *
 * Generates a real UltraHonk proof (Noir circuit + Barretenberg) binding a link secret
 * to a specific Stellar recipient. The proof is verified off-chain by the backend attester,
 * which then submits an on-chain attestation. See contracts/README.md for architecture.
 *
 * ## Dual-hash architecture (issue #68)
 *
 * Two different hashes are used for two different purposes. They are deliberately kept
 * separate and must NOT be confused with each other:
 *
 * | Hash | Algorithm | Where used | Purpose |
 * |------|-----------|------------|---------|
 * | `linkHashHex` | SHA-256(secret_bytes) | On-chain storage key (`link_id`) | Links URL to contract storage. Embedded in the shareable URL. Passed as `:hash` in the attest API path. |
 * | `linkHashFieldHex` | Pedersen(secret_field) | ZK circuit public input (`link_hash`) | Proves knowledge of secret inside the Noir circuit without revealing it. Verified by the backend attester before recording an attestation. |
 *
 * The Noir circuit (`circuits/src/policies/secret.nr`) uses ONLY Pedersen hashes.
 * The contract uses ONLY SHA-256 for the storage key (on-chain; no Pedersen available in Soroban).
 * The backend ZK verifier (`backend/src/lib/zk.ts`) receives only Pedersen field hashes.
 *
 * Field encoding matches backend/src/lib/zk.ts — do not change one without the other.
 */

import { StrKey } from "@stellar/stellar-sdk";

// BN254 scalar field order — matches Noir/Barretenberg's Field type
// Using BigInt() constructor instead of 'n' suffix for ES2017 TS target compatibility
const FR_ORDER = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

// Pedersen hash index confirmed to match Noir's std::hash::pedersen_hash
const PEDERSEN_HASH_INDEX = 0;

function secretToField(secretBytes: Uint8Array): bigint {
  const hex = Array.from(secretBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return BigInt("0x" + hex) % FR_ORDER;
}

function addressToField(stellarAddress: string): bigint {
  const pubkeyBytes = StrKey.decodeEd25519PublicKey(stellarAddress);
  const hex = Array.from(pubkeyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return BigInt("0x" + hex) % FR_ORDER;
}

function fieldToHex(f: bigint): string {
  return "0x" + f.toString(16).padStart(64, "0");
}

function frBuffer(val: bigint): Uint8Array {
  const buf = new Uint8Array(32);
  let v = val;
  const mask = BigInt(0xff);
  const shift = BigInt(8);
  for (let i = 31; i >= 0; i--) {
    buf[i] = Number(v & mask);
    v >>= shift;
  }
  return buf;
}

let circuitCache: any = null;
let bbSyncCache: any = null;

async function loadCircuit(): Promise<any> {
  if (circuitCache) return circuitCache;
  const resp = await fetch("/circuits/secret.json");
  if (!resp.ok) throw new Error("Failed to load circuit: " + resp.statusText);
  circuitCache = await resp.json();
  return circuitCache;
}

/**
 * Generate a real UltraHonk proof for the claim flow.
 *
 * Returns the raw proof bytes plus the circuit's public inputs (link_hash and nullifier,
 * as Pedersen field elements) — the caller POSTs these (hex-encoded) to the backend
 * attest endpoint along with the recipient. The private secret never leaves the client:
 * the backend verifies the proof against these public inputs alone.
 */
export async function generateClaimProof(
  secretBytes: Uint8Array,
  recipientAddress: string
): Promise<{ proof: Uint8Array; linkHashHex: string; linkHashFieldHex: string; nullifierFieldHex: string }> {
  // Dynamic imports — these are large WASM modules, only load when needed
  const bbModule = await import("@aztec/bb.js");
  const noirModule = await import("@noir-lang/noir_js");
  const { Barretenberg, BarretenbergSync, UltraHonkBackend } = bbModule;
  const { Noir } = noirModule;

  // 1. Compute field-domain values
  const secretField = secretToField(secretBytes);
  const recipientField = addressToField(recipientAddress);

  // 2. Compute Pedersen hashes — use cached sync instance (no destroy needed)
  if (!bbSyncCache) {
    bbSyncCache = await BarretenbergSync.new();
  }
  const bbSync = bbSyncCache;

  const linkHashResult = (bbSync as any).pedersenHash({
    inputs: [frBuffer(secretField)],
    hashIndex: PEDERSEN_HASH_INDEX,
  });
  const linkHashField = BigInt(
    "0x" +
      Array.from(new Uint8Array(linkHashResult.hash))
        .map((b: number) => b.toString(16).padStart(2, "0"))
        .join("")
  );

  const nullifierResult = (bbSync as any).pedersenHash({
    inputs: [frBuffer(secretField), frBuffer(recipientField)],
    hashIndex: PEDERSEN_HASH_INDEX,
  });
  const nullifierField = BigInt(
    "0x" +
      Array.from(new Uint8Array(nullifierResult.hash))
        .map((b: number) => b.toString(16).padStart(2, "0"))
        .join("")
  );

  // 3. Load circuit and execute for witness
  const circuit = await loadCircuit();
  const noir = new Noir(circuit);

  const inputs = {
    secret: fieldToHex(secretField),
    recipient: fieldToHex(recipientField),
    link_hash: fieldToHex(linkHashField),
    nullifier: fieldToHex(nullifierField),
  };

  const { witness } = await noir.execute(inputs);

  // 4. Generate UltraHonk proof — use a fresh async instance (not the singleton)
  //    so that api.destroy() properly cleans up and subsequent calls don't
  //    receive a destroyed singleton.
  const api = await Barretenberg.new({ threads: 1 });
  try {
    const backend = new UltraHonkBackend(circuit.bytecode, api);
    const result = await backend.generateProof(witness);

    // Compute SHA-256 link hash for the API path
    const hashBuffer = await crypto.subtle.digest("SHA-256", new Uint8Array(secretBytes) as unknown as ArrayBuffer);
    const linkHashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return {
      proof: result.proof,
      linkHashHex,
      linkHashFieldHex: fieldToHex(linkHashField),
      nullifierFieldHex: fieldToHex(nullifierField),
    };
  } finally {
    await api.destroy();
  }
}

/**
 * POST proof to the backend attest endpoint, along with the circuit's public inputs
 * (link_hash and nullifier). The private secret is never sent — the backend verifies
 * the proof against these public inputs alone.
 * Returns the attestation transaction hash on success.
 */
export async function requestAttestation(
  linkHashHex: string,
  proofHex: string,
  recipientAddress: string,
  linkHashFieldHex: string,
  nullifierFieldHex: string,
  recipientEmailHash?: string
): Promise<string> {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
  const url = `${backendUrl}/api/links/${linkHashHex}/attest`;

  const body: Record<string, string> = {
    recipient: recipientAddress,
    proof: proofHex,
    link_hash: linkHashFieldHex,
    nullifier: nullifierFieldHex,
  };
  if (recipientEmailHash) {
    body.recipient_email_hash = recipientEmailHash;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Attestation request failed");
  }

  return data.attestationTx;
}
