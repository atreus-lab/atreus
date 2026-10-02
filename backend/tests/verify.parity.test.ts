import { readFileSync } from 'fs';
import { join } from 'path';
import { verifyClaimProof } from '../src/lib/zk';
import { Barretenberg } from '@aztec/bb.js';

const fixturesDir = join(__dirname, '../../tests/fixtures');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'));
}

describe('UltraHonk verifier parity', () => {
  it('accepts known-good proof via native service and bb.js', async () => {
    const good = loadFixture('good_proof.json');
    const proof = Buffer.from(good.proof, 'base64');

    const native = await verifyClaimProof(good.recipient, good.link_hash, good.nullifier, proof);
    expect(native).toBe(true);

    // Differential check against bb.js fallback
    const wasmPath = join(__dirname, '../../node_modules/@aztec/bb.js');
    const bb = await Barretenberg.new({ threads: 1, wasmPath });
    const bbValid = await bb.verifyProof(proof, good.recipient, good.link_hash, good.nullifier);
    expect(bbValid).toBe(true);
    expect(native).toBe(bbValid);
  });

  it('rejects tampered proof via native service and bb.js', async () => {
    const bad = loadFixture('bad_proof.json');
    const proof = Buffer.from(bad.proof, 'base64');

    const native = await verifyClaimProof(bad.recipient, bad.link_hash, bad.nullifier, proof);
    expect(native).toBe(false);

    const wasmPath = join(__dirname, '../../node_modules/@aztec/bb.js');
    const bb = await Barretenberg.new({ threads: 1, wasmPath });
    const bbValid = await bb.verifyProof(proof, bad.recipient, bad.link_hash, bad.nullifier);
    expect(bbValid).toBe(false);
    expect(native).toBe(bbValid);
  });
});
