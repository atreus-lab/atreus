import { Barretenberg } from '@aztec/bb.js';
import path from 'path';
import { isUrlSafe } from './ssrf';
import { verifyViaNativeService } from './verifierClient';

let bbInstance: Barretenberg | null = null;

async function getBarretenberg(): Promise<Barretenberg> {
  if (bbInstance) return bbInstance;
  const wasmPath = path.resolve(__dirname, '../../node_modules/@aztec/bb.js');
  bbInstance = await Barretenberg.new({ threads: 1, wasmPath });
  return bbInstance;
}

export async function verifyClaimProof(
  recipient: string,
  linkHash: string,
  nullifier: string,
  proof: Buffer
): Promise<boolean> {
  const verifierUrl = process.env.VERIFIER_SERVICE_URL;
  if (verifierUrl && isUrlSafe(verifierUrl)) {
    try {
      const proofB64 = proof.toString('base64');
      return await verifyViaNativeService(recipient, linkHash, nullifier, proofB64);
    } catch (err) {
      console.warn('Native verifier unavailable, falling back to bb.js', err);
    }
  }
  const bb = await getBarretenberg();
  // Existing bb.js verification path kept as fallback
  // The exact API matches the current implementation in backend/src/lib/zk.ts:60
  const valid = await bb.verifyProof(proof, recipient, linkHash, nullifier);
  return valid;
}
