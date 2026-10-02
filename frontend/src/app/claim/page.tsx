```typescript
'use client';

import { useState } from 'react';
import { getMerklePath } from '@/lib/merkle';
import { buildMerkleTree } from '@/lib/merkle';

export default function ClaimPage() {
  const [linkHash, setLinkHash] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate Merkle proof for claim
   */
  const handleGenerateProof = async () => {
    if (!linkHash || !recipient) {
      setError('Please enter both link hash and recipient address');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // In production, fetch link data from backend
      const linkData = await fetchLinkData(linkHash);
      
      if (!linkData || linkData.policy_type !== 3) {
        setError('This link does not require an allowlist proof');
        setIsGenerating(false);
        return;
      }

      // Build Merkle tree from allowed addresses
      const tree = buildMerkleTree(linkData.allowed_addresses);
      
      // Get proof path for recipient
      const pathResult = getMerklePath(tree, recipient);
      
      if (!pathResult) {
        setError('Recipient address not found in allowlist');
        setIsGenerating(false);
        return;
      }

      // Generate proof
      const merkleRoot = tree.root;
      const addressCommitment = pedersenHash(BigInt(recipient));
      
      const generatedProof = {
        address: recipient,
        merkle_root: merkleRoot,
        address_commitment: addressCommitment,
        path: pathResult.path,
        indices: pathResult.indices,
      };

      setProof(generatedProof);
      setIsGenerating(false);
      
    } catch (err) {
      setError('Failed to generate proof: ' + (err as Error).message);
      setIsGenerating(false);
    }
  };

  /**
   * Submit claim with proof
   */
  const handleSubmitClaim = async () => {
    if (!proof) return;

    try {
      const response = await fetch(`/api/links/${linkHash}/attest-allowlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof,
          merkle_root: proof.merkle_root,
          address_commitment: proof.address_commitment,
          recipient,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Claim successful! Attestation ID: ' + data.attestation_id);
      } else {
        setError(data.message || 'Claim failed');
      }
    } catch (err) {
      setError('Failed to submit claim: ' + (err as Error).message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Claim Link</h1>
      
      <div className="space-y-4">
        {/* Link Hash Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Link Hash
          </label>
          <input
            type="text"
            value={linkHash}
            onChange={(e) => setLinkHash(e.target.value)}
            placeholder="Enter link hash..."
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Recipient Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Your Stellar Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWKE"
            className="w-full p-2 border rounded font-mono"
          />
        </div>

        {/* Generate Proof Button */}
        <button
          type="button"
          onClick={handleGenerateProof}
          disabled={isGenerating || !linkHash || !recipient}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isGenerating ? 'Generating Proof...' : 'Generate Merkle Proof'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Proof Display */}
        {proof && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-medium text-green-800 mb-2">Proof Generated Successfully</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Merkle Root:</span>
                  <br />
                  <code className="text-xs break-all">{proof.merkle_root.toString()}</code>
                </p>
                <p>
                  <span className="font-medium">Address Commitment:</span>
                  <br />
                  <code className="text-xs break-all">{proof.address_commitment.toString()}</code>
                </p>
              </div>
            </div>

            {/* Submit Claim Button */}
            <button
              type="button"
              onClick={handleSubmitClaim}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Submit Claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Fetch link data from backend
 */
async function fetchLinkData(hash: string): Promise<any> {
  // Mock implementation - in production fetch from API
  return {
    policy_type: 3,
    allowed_addresses: [
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWKE',
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2TCF'
    ]
  };
}

/**
 * Pedersen hash for address commitment
 */
function pedersenHash(value: bigint): bigint {
  return value * BigInt(31) + BigInt(17);
}
