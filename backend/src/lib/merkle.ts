```typescript
import { createHash } from 'crypto';

const DEPTH = 20;

interface PedersenHash {
  (value: bigint): bigint;
}

// Simple hash function for demonstration
// In production, use a proper cryptographic hash
function pedersenHash(value: bigint): bigint {
  const hash = createHash('sha256');
  hash.update(value.toString());
  const buffer = hash.digest();
  return BigInt('0x' + buffer.toString('hex'));
}

interface MerkleTree {
  root: bigint;
  leaves: bigint[];
  tree: bigint[][];
}

interface PathResult {
  path: bigint[];
  indices: number[];
}

/**
 * Build a Pedersen Merkle tree from a list of Stellar addresses
 */
export function buildMerkleTree(addresses: string[]): MerkleTree {
  // Hash addresses to create leaf nodes
  const leaves: bigint[] = addresses.map(addr => pedersenHash(BigInt(addr)));
  
  // Pad to nearest power of 2
  const leafCount = Math.pow(2, Math.ceil(Math.log2(leaves.length || 1)));
  while (leaves.length < leafCount) {
    leaves.push(pedersenHash(BigInt(0)));
  }
  
  // Build tree bottom-up
  const tree: bigint[][] = [leaves];
  
  for (let level = 0; level < DEPTH; level++) {
    const currentLevel = tree[level];
    const nextLevel: bigint[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];
      nextLevel.push(pedersenHash(left + right));
    }
    
    tree.push(nextLevel);
  }
  
  const root = tree[DEPTH][0];
  
  return { root, leaves, tree };
}

/**
 * Get the Merkle proof path for a specific address
 */
export function getMerklePath(tree: MerkleTree, address: string): PathResult | null {
  const leafIndex = tree.leaves.findIndex(leaf => {
    const hashedAddr = pedersenHash(BigInt(address));
    return leaf === hashedAddr;
  });
  
  if (leafIndex === -1) {
    return null;
  }
  
  const path: bigint[] = [];
  const indices: number[] = [];
  let currentIndex = leafIndex;
  
  for (let level = 0; level < DEPTH; level++) {
    const currentLevel = tree.tree[level];
    
    // Determine sibling index
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    path.push(currentLevel[siblingIndex]);
    indices.push(currentIndex % 2);
    
    // Move to parent
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return { path, indices };
}

/**
 * Verify a Merkle proof
 */
export function verifyMerkleProof(
  address: string,
  merkleRoot: bigint,
  path: bigint[],
  indices: number[]
): boolean {
  let current = pedersenHash(BigInt(address));
  
  for (let i = 0; i < DEPTH; i++) {
    const index = indices[i];
    const sibling = path[i];
    
    if (index === 0) {
      current = pedersenHash(current + sibling);
    } else {
      current = pedersenHash(sibling + current);
    }
  }
  
  return current === merkleRoot;
}
