```typescript
'use client';

import { useState } from 'react';
import { buildMerkleTree } from '@/lib/merkle';

export default function CreateLinkPage() {
  const [policyType, setPolicyType] = useState<'none' | 'time' | 'allowlist'>('none');
  const [allowlistInput, setAllowlistInput] = useState('');
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Parse allowlist input (one address per line or .txt file upload)
   */
  const parseAllowlist = (input: string): string[] => {
    return input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && /^G[A-Z0-9]{55}$/.test(line));
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const addresses = parseAllowlist(text);
      setAllowlistInput(addresses.join('\n'));
    };
    reader.readAsText(file);
  };

  /**
   * Build Merkle tree and generate root
   */
  const handleBuildMerkleTree = () => {
    const addresses = parseAllowlist(allowlistInput);
    if (addresses.length === 0) return;

    setIsProcessing(true);
    const tree = buildMerkleTree(addresses);
    setMerkleRoot(tree.root.toString());
    setIsProcessing(false);
  };

  /**
   * Submit link creation
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // In production, this would call the smart contract
    console.log('Creating link with policy:', policyType);
    console.log('Merkle root:', merkleRoot);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Link</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Policy Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Policy Type
          </label>
          <select
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value as any)}
            className="w-full p-2 border rounded"
          >
            <option value="none">None</option>
            <option value="time">Time-based</option>
            <option value="allowlist">Allowlist (Merkle)</option>
          </select>
        </div>

        {/* Allowlist Input */}
        {policyType === 'allowlist' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Allowed Addresses (one per line)
              </label>
              <textarea
                value={allowlistInput}
                onChange={(e) => setAllowlistInput(e.target.value)}
                placeholder={"GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWKE\nGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2TCF..."}
                rows={10}
                className="w-full p-2 border rounded font-mono text-sm"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Or upload .txt file
              </label>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Build Merkle Tree */}
            <button
              type="button"
              onClick={handleBuildMerkleTree}
              disabled={isProcessing || !allowlistInput}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isProcessing ? 'Building...' : 'Build Merkle Tree'}
            </button>

            {/* Merkle Root Display */}
            {merkleRoot && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Merkle Root:</span>
                  <br />
                  <code className="text-xs break-all">{merkleRoot}</code>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Create Link
        </button>
      </form>
    </div>
  );
}
