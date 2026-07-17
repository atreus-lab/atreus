import { StrKey } from "@stellar/stellar-sdk";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { createHash } from "crypto";
import { resolve } from "path";
import { existsSync, writeFileSync, mkdirSync } from "fs";

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
 * Resolve the path to the barretenberg WASM file.
 *
 * 1. Tries `wasm/barretenberg-threads.wasm.gz` relative to cwd (works in local dev
 *    after `npm run prebuild`, or on Vercel if the file was included via includeFiles).
 * 2. If the file doesn't exist locally, downloads from `FRONTEND_URL/wasm/barretenberg-threads.wasm.gz`
 *    (the frontend serves this as a static asset from its public/ directory) and caches
 *    it to `/tmp/` for the lifetime of the cold start.
 */
let cachedWasmPath: string | null = null;

async function getWasmPath(): Promise<string> {
  if (cachedWasmPath) return cachedWasmPath;

  // 1. Try local filesystem path (works in local dev, or when Vercel includes via wasm/**)
  const localPath = resolve(process.cwd(), "wasm/barretenberg-threads.wasm.gz");
  if (existsSync(localPath)) {
    cachedWasmPath = localPath;
    return localPath;
  }

  // 2. Fallback — download from the frontend URL and cache to /tmp/
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    const url = `${frontendUrl.replace(/\/$/, "")}/wasm/barretenberg-threads.wasm.gz`;
    const resp = await fetch(url);
    if (resp.ok) {
      const buffer = Buffer.from(await resp.arrayBuffer());
      const tmpPath = "/tmp/barretenberg-threads.wasm.gz";
      mkdirSync("/tmp", { recursive: true });
      writeFileSync(tmpPath, buffer);
      cachedWasmPath = tmpPath;
      return tmpPath;
    }
  }

  // If all fallbacks fail, return the local path anyway (bb.js will throw ENOENT)
  cachedWasmPath = localPath;
  return localPath;
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
  // Pass an explicit wasmPath so bb.js can find the WASM without relying on the
  // pnpm virtual-store symlink (which is stripped by Vercel's deployment builder).
  const wasmPath = await getWasmPath();
  const api = await Barretenberg.new({ threads: 1, wasmPath });
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
