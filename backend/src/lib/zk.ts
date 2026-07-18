import { StrKey } from "@stellar/stellar-sdk";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { createHash } from "crypto";

/**
 * backend/src/lib/zk.ts — Off-chain ZK proof verification for the attestation service.
 *
 * ## Dual-hash architecture (issue #68)
 *
 * Two different hashes serve two different roles. They must NOT be confused:
 *
 * | Hash | Algorithm | Where used | Purpose |
 * |------|-----------|------------|---------|
 * | SHA-256(secret_bytes) | SHA-256 | On-chain `link_id` (storage key) | URL → contract mapping. Appears as `:hash` in the attest API route. |
 * | Pedersen(secret_field) | Pedersen (BN254) | ZK circuit `link_hash` public input | Proves knowledge of secret inside the Noir circuit. This is what `verifyClaimProof` checks. |
 *
 * `verifyClaimProof` accepts only the Pedersen-domain values (recipient, link_hash, nullifier)
 * as public inputs for the UltraHonk verifier. It never sees or needs the raw secret.
 */

// BN254 (alt_bn128) scalar field order — matches Noir/Barretenberg's Field type.
export const FR_ORDER =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// A field element is always 32 bytes, so a valid hex encoding is always exactly 64 chars.
const FIELD_HEX_LEN = 64;

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

export function addressToField(stellarAddress: string): bigint {
  const pubkeyBytes = StrKey.decodeEd25519PublicKey(stellarAddress);
  const hex = Buffer.from(pubkeyBytes).toString("hex");
  return BigInt("0x" + hex) % FR_ORDER;
}

/**
 * Parses a "0x..."-prefixed field element hex string into a bigint, reduced mod FR_ORDER.
 * Requires exactly 32 bytes (64 hex chars) after stripping the prefix — a truncated or
 * oversized string is rejected outright rather than silently producing the wrong field
 * value (or, unbounded, becoming a CPU/memory DoS vector via BigInt() on a huge string).
 */
export function parseFieldHex(hex: string): bigint {
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (clean.length !== FIELD_HEX_LEN || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error(`Invalid field element hex string: expected ${FIELD_HEX_LEN} hex chars`);
  }
  return BigInt("0x" + clean) % FR_ORDER;
}

function fieldToProofInput(f: bigint): string {
  return "0x" + f.toString(16).padStart(64, "0");
}

/**
 * Verifies a real UltraHonk proof against the circuit's public inputs only — recipient,
 * link_hash, and nullifier (all Pedersen field elements supplied by the caller). The
 * backend never sees, and does not need, the private secret: that's the whole point of a
 * ZK verifier — it checks the proof against public statements, not private witnesses.
 */
export async function verifyClaimProof(
  circuitBytecode: string,
  proofBytes: Uint8Array,
  recipient: string,
  linkHashHex: string,
  nullifierHex: string
): Promise<boolean> {
  const recipientField = addressToField(recipient);
  const linkHashField = parseFieldHex(linkHashHex);
  const nullifierField = parseFieldHex(nullifierHex);

  // Fresh instance per call (not the shared singleton) — this is destroyed below, and
  // destroying the singleton would break any other request verifying concurrently.
  const api = await Barretenberg.new({ threads: 1 });
  const backend = new UltraHonkBackend(circuitBytecode, api);
  try {
    return await backend.verifyProof({
      proof: proofBytes,
      publicInputs: [
        fieldToProofInput(recipientField),
        fieldToProofInput(linkHashField),
        fieldToProofInput(nullifierField),
      ],
    } as any);
  } finally {
    await api.destroy();
  }
}
