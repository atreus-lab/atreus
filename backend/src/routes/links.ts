```typescript
import { Router } from 'express';
import { verifyAllowlistProof } from '../lib/zk.ts';
import { buildMerkleTree, getMerklePath, verifyMerkleProof } from '../lib/merkle.ts';

const router = Router();

interface AttestAllowlistRequest {
  proof: {
    address: string;
    merkle_root: bigint;
    address_commitment: bigint;
    path: bigint[];
    indices: number[];
  };
  merkle_root: bigint;
  address_commitment: bigint;
  recipient: string;
  link_hash: string;
}

interface AttestAllowlistResponse {
  success: boolean;
  message?: string;
  attestation_id?: string;
}

/**
 * POST /api/links/:hash/attest-allowlist
 * Verify Merkle proof and issue attestation
 */
router.post('/api/links/:hash/attest-allowlist', async (req, res) => {
  try {
    const { hash } = req.params;
    const body: AttestAllowlistRequest = req.body;
    
    // Validate required fields
    if (!body.proof || !body.merkle_root || !body.address_commitment || !body.recipient) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Verify the Merkle proof
    const isValid = verifyMerkleProof(
      body.proof.address,
      body.merkle_root,
      body.proof.path,
      body.proof.indices
    );
    
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid Merkle proof' 
      });
    }
    
    // Verify address commitment matches
    const expectedCommitment = pedersenHash(BigInt(body.proof.address));
    if (expectedCommitment !== body.address_commitment) {
      return res.status(400).json({ 
        success: false, 
        message: 'Address commitment mismatch' 
      });
    }
    
    // Check if link exists and is valid
    const link = await getLinkByHash(hash);
    if (!link) {
      return res.status(404).json({ 
        success: false, 
        message: 'Link not found' 
      });
    }
    
    // Check if recipient is allowed
    const allowedAddresses = link.policy_params?.allowedAddresses || [];
    const isAllowed = allowedAddresses.some(addr => 
      pedersenHash(BigInt(addr)) === body.address_commitment
    );
    
    if (!isAllowed) {
      return res.status(403).json({ 
        success: false, 
        message: 'Address not in allowlist' 
      });
    }
    
    // Generate attestation
    const attestationId = await generateAttestation({
      link_hash: hash,
      recipient: body.recipient,
      proof: body.proof,
      merkle_root: body.merkle_root,
      address_commitment: body.address_commitment,
    });
    
    res.json({ 
      success: true, 
      attestation_id: attestationId,
      message: 'Attestation issued successfully' 
    });
    
  } catch (error) {
    console.error('Error processing attest-allowlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * Helper: Generate attestation ID
 */
async function generateAttestation(data: {
  link_hash: string;
  recipient: string;
  proof: any;
  merkle_root: bigint;
  address_commitment: bigint;
}): Promise<string> {
  // In production, store in database and return ID
  return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper: Get link by hash
 */
async function getLinkByHash(hash: string): Promise<any> {
  // Mock implementation - in production query database
  return {
    hash,
    policy_params: {
      allowedAddresses: [] // Populated from link creation
    }
  };
}

/**
 * Helper: Pedersen hash for addresses
 */
function pedersenHash(value: bigint): bigint {
  return value * BigInt(31) + BigInt(17);
}

export default router;
