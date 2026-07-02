/**
 * frontend/src/lib/zk.ts — Client-side ZK proof generation for the claim flow.
 *
 * Generates a real UltraHonk proof (Noir circuit + Barretenberg) binding a link secret
 * to a specific Stellar recipient. The proof is verified off-chain by the backend attester,
 * which then submits an on-chain attestation. See contracts/README.md for architecture.
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
 * Returns the raw proof bytes — the caller POSTs these (hex-encoded) to the backend
 * attest endpoint along with the secret and recipient. The backend independently
 * recomputes the expected public inputs and verifies against those (not client-supplied),
 * so there's no trust issue with the client generating the proof.
 */
export async function generateClaimProof(
  secretBytes: Uint8Array,
  recipientAddress: string
): Promise<{ proof: Uint8Array; linkHashHex: string }> {
  // Dynamic imports — these are large WASM modules, only load when needed
  const bbModule = await import("@aztec/bb.js");
  const noirModule = await import("@noir-lang/noir_js");
  const { Barretenberg, BarretenbergSync, UltraHonkBackend } = bbModule;
  const { Noir } = noirModule;

  // 1. Compute field-domain values
  const secretField = secretToField(secretBytes);
  const recipientField = addressToField(recipientAddress);

  // 2. Compute Pedersen hashes
  const bbSync = await BarretenbergSync.initSingleton();

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

  // 4. Generate UltraHonk proof
  const api = await Barretenberg.initSingleton({ threads: 1 });
  const backend = new UltraHonkBackend(circuit.bytecode, api);
  const result = await backend.generateProof(witness);

  // Compute SHA-256 link hash for the API path
  const hashBuffer = await crypto.subtle.digest("SHA-256", new Uint8Array(secretBytes) as unknown as ArrayBuffer);
  const linkHashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await api.destroy();

  return { proof: result.proof, linkHashHex };
}

/**
 * POST proof to the backend attest endpoint.
 * Returns the attestation transaction hash on success.
 */
export async function requestAttestation(
  linkHashHex: string,
  secretHex: string,
  proofHex: string,
  recipientAddress: string
): Promise<string> {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
  const url = `${backendUrl}/api/links/${linkHashHex}/attest`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: recipientAddress,
      secret: secretHex,
      proof: proofHex,
    }),
  });

  const body = await resp.json();
  if (!resp.ok) {
    throw new Error(body.error || "Attestation request failed");
  }

  return body.attestationTx;
}
