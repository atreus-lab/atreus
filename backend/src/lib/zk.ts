import { StrKey } from "@stellar/stellar-sdk";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";

// BN254 (alt_bn128) scalar field order — matches Noir/Barretenberg's Field type.
export const FR_ORDER =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export function addressToField(stellarAddress: string): bigint {
  const pubkeyBytes = StrKey.decodeEd25519PublicKey(stellarAddress);
  const hex = Buffer.from(pubkeyBytes).toString("hex");
  return BigInt("0x" + hex) % FR_ORDER;
}

/** Parses a "0x..."-prefixed field element hex string into a bigint, reduced mod FR_ORDER. */
export function parseFieldHex(hex: string): bigint {
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length === 0) {
    throw new Error("Invalid field element hex string");
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
