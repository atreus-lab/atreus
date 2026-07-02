import { StrKey } from "@stellar/stellar-sdk";
import { Barretenberg, BarretenbergSync, UltraHonkBackend } from "@aztec/bb.js";
import { createHash } from "crypto";

// BN254 (alt_bn128) scalar field order — matches Noir/Barretenberg's Field type.
export const FR_ORDER =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// hashIndex=0 is the value confirmed (frontend/scripts/verify-pedersen.mjs) to match
// Noir's std::hash::pedersen_hash bit-for-bit.
const PEDERSEN_HASH_INDEX = 0;

export function secretToField(secretBytes: Uint8Array): bigint {
  const hex = Buffer.from(secretBytes).toString("hex");
  return BigInt("0x" + hex) % FR_ORDER;
}

export function addressToField(stellarAddress: string): bigint {
  const pubkeyBytes = StrKey.decodeEd25519PublicKey(stellarAddress);
  const hex = Buffer.from(pubkeyBytes).toString("hex");
  return BigInt("0x" + hex) % FR_ORDER;
}

function frBuffer(val: bigint): Buffer {
  const buf = Buffer.alloc(32);
  let v = val;
  for (let i = 31; i >= 0; i--) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return buf;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

let barretenbergSync: Awaited<ReturnType<typeof BarretenbergSync.initSingleton>> | null = null;
async function getBarretenbergSync() {
  if (!barretenbergSync) {
    barretenbergSync = await BarretenbergSync.initSingleton();
  }
  return barretenbergSync;
}

export async function pedersenHashField(inputs: bigint[]): Promise<bigint> {
  const api = await getBarretenbergSync();
  const result = api.pedersenHash({
    inputs: inputs.map(frBuffer),
    hashIndex: PEDERSEN_HASH_INDEX,
  });
  return BigInt("0x" + Buffer.from(result.hash).toString("hex"));
}

/**
 * Recomputes the expected circuit public inputs from data the backend independently
 * confirms (the raw secret + recipient), rather than trusting client-supplied public
 * inputs — closes the "verify the proof but not the statement" binding gap.
 */
export async function expectedPublicInputs(secretBytes: Uint8Array, recipient: string) {
  const secretField = secretToField(secretBytes);
  const recipientField = addressToField(recipient);
  const linkHashField = await pedersenHashField([secretField]);
  const nullifierField = await pedersenHashField([secretField, recipientField]);
  return { recipientField, linkHashField, nullifierField };
}

function fieldToProofInput(f: bigint): string {
  return "0x" + f.toString(16).padStart(64, "0");
}

/**
 * Verifies a real UltraHonk proof against the backend's own recomputed public inputs
 * (not client-supplied ones). Returns true only if the proof is cryptographically valid
 * for exactly this secret/recipient pair.
 */
export async function verifyClaimProof(
  circuitBytecode: string,
  proofBytes: Uint8Array,
  secretBytes: Uint8Array,
  recipient: string
): Promise<boolean> {
  const { recipientField, linkHashField, nullifierField } = await expectedPublicInputs(
    secretBytes,
    recipient
  );

  const api = await Barretenberg.initSingleton({ threads: 1, backend: "Wasm" as any });
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
