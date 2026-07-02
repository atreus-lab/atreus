'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { connectWallet, claimLinkTx } from '@/lib/stellar';
import { bytesToHex } from '@/lib/proof';
import { generateClaimProof, requestAttestation } from '@/lib/zk';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Link2 } from 'lucide-react';

type ClaimStatus =
  | 'idle'
  | 'connecting'
  | 'generating_proof'
  | 'attesting'
  | 'claiming'
  | 'success'
  | 'error';

export default function ClaimPage() {
  const router = useRouter();
  const [secretHex, setSecretHex] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState('');
  const [linkInput, setLinkInput] = useState('');

  const parseLinkInput = () => {
    const hash = linkInput.split('#')[1];
    if (hash) {
      setSecretHex(hash);
      setLinkInput('');
    }
  };

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) setSecretHex(hash);
  }, []);

  const handleClaim = async () => {
    try {
      setStatus('connecting');
      setErrorMsg('');

      const recipient = await connectWallet();

      const secretBytes = new Uint8Array(secretHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

      setStatus('generating_proof');
      const { proof, linkHashHex } = await generateClaimProof(secretBytes, recipient);

      setStatus('attesting');
      const proofHex = bytesToHex(proof);
      await requestAttestation(linkHashHex, secretHex, proofHex, recipient);

      setStatus('claiming');
      const linkHash = new Uint8Array(await crypto.subtle.digest('SHA-256', secretBytes));
      const hash = await claimLinkTx(recipient, linkHash, secretBytes);
      setTxHash(hash);

      setStatus('success');
      localStorage.setItem('atreus_claimed', Date.now().toString());
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Claim failed');
      setStatus('error');
    }
  };

  const statusText: Record<ClaimStatus, string> = {
    idle: 'Claim with ZK Proof',
    connecting: 'Connecting Wallet...',
    generating_proof: 'Generating ZK Proof...',
    attesting: 'Verifying Proof & Attesting...',
    claiming: 'Claiming Funds...',
    success: 'Claimed!',
    error: 'Try Again',
  };

  const isDisabled =
    status === 'connecting' ||
    status === 'generating_proof' ||
    status === 'attesting' ||
    status === 'claiming';

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100 space-y-6">
        <Link
          href="/"
          className="text-sm font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <h2 className="text-xl font-extrabold text-slate-900">Claim Link</h2>

        {secretHex ? (
          <>
            <p className="text-sm text-slate-500">
              A payment has been found! Verify your identity with a ZK proof to claim it.
            </p>

            {status === 'generating_proof' && (
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium p-3 rounded-xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating UltraHonk ZK proof — this may take a moment...
              </div>
            )}

            {status === 'attesting' && (
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium p-3 rounded-xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying proof and recording attestation on Stellar...
              </div>
            )}

            {status === 'connecting' && (
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium p-3 rounded-xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting wallet...
              </div>
            )}

            {status === 'claiming' && (
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium p-3 rounded-xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Claiming funds on-chain...
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium p-3 rounded-xl">
                {errorMsg}
              </div>
            )}

            <button
              disabled={isDisabled}
              onClick={handleClaim}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                status === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_4px_12px_rgba(79,70,229,0.3)]'
              }`}
            >
              {status === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> {statusText[status]}
                </>
              ) : isDisabled ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {statusText[status]}
                </>
              ) : (
                statusText[status]
              )}
            </button>

            {status === 'success' && (
              <div className="text-center space-y-3">
                <p className="text-sm text-green-600 font-semibold">
                  Funds transferred to your wallet!
                </p>
                {txHash && (
                  <p className="text-xs text-slate-400">TX: {txHash.substring(0, 16)}...</p>
                )}
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setSecretHex('');
                      setErrorMsg('');
                      setTxHash('');
                      window.location.hash = '';
                    }}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    Claim Another
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-5 py-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Link2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Paste a payment link to claim the funds.
              </p>
            </div>
            <input
              type="text"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && parseLinkInput()}
              placeholder="https://localhost:3000/claim#..."
              className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-900"
            />
            <button
              onClick={parseLinkInput}
              disabled={!linkInput.includes('#')}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
            >
              Start Claim
            </button>
            <Link
              href="/"
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 block text-center"
            >
              Go Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
