'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadWallet } from '@/lib/wallet';
import { connectWallet, claimLinkTx } from '@/lib/stellar';
import { bytesToHex } from '@/lib/proof';
import { generateClaimProof, requestAttestation } from '@/lib/zk';
import { updateLinkStatus, checkLinkOnChain, saveClaimedLink, readLinkInfo } from '@/lib/links';
import { recordEvent } from '@/lib/analytics';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Link2, Mail } from 'lucide-react';

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
  const [errorKind, setErrorKind] = useState<'error' | 'info' | 'expired'>('error');
  const [txHash, setTxHash] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [intendedEmail, setIntendedEmail] = useState<string | null>(null);
  const [walletEmail, setWalletEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      try {
        setIntendedEmail(atob(emailParam));
      } catch {}
    }
    const wallet = loadWallet();
    if (wallet?.email) {
      setWalletEmail(wallet.email);
    }
  }, []);

  async function sha256Hash(str: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str.toLowerCase().trim());
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  }

  /** Map contract panic messages and network errors to user-friendly messages */
function getFriendlyErrorMessage(err: any): { title: string; description: string } {
  const rawMsg = err?.message || err?.toString() || '';
  const msg = rawMsg.toLowerCase();

  // Check for already-claimed before anything else — it can show up directly
  // or as a WasmVm UnreachableCodeReached trap (when the panic message doesn't
  // propagate cleanly from the contract VM).
  if (msg.includes('already claimed'))
    return { title: 'Funds already claimed', description: 'This payment link has already been claimed. The funds are no longer available.' };

  // WasmVm trap that happens when claim_link panics (secret verified, attestation
  // passed, then claimed check triggers panic! which shows as UnreachableCodeReached)
  if (
    msg.includes('wasmvm') ||
    msg.includes('invalidaction') ||
    msg.includes('unreachablecodereached') ||
    msg.includes('vm call trapped') ||
    msg.includes('hosterror') && msg.includes('claim_link')
  ) {
    // Check the event log for telltale signs of "already claimed" or "expired"
    if (msg.includes('fn_return') && msg.includes('is_attested') && msg.includes('true')) {
      // is_attested returned true, then claim_link trapped → almost certainly "already claimed"
      return { title: 'Funds already claimed', description: 'This payment link has already been claimed. The funds are no longer available.' };
    }
    return { title: 'Contract error', description: 'The transaction could not be completed. This link may have already been claimed or is invalid. Please check the link and try again.' };
  }

  if (msg.includes('invalid secret'))
    return { title: 'Invalid link', description: 'The secret key for this link is incorrect. Please check the link and try again.' };
  if (msg.includes('link expired') || msg.includes('expired'))
    return { title: 'Link expired', description: 'This payment link has expired and can no longer be claimed.' };
  if (msg.includes('no valid zk attestation'))
    return { title: 'Proof verification pending', description: 'The ZK proof attestation has not been recorded yet. Please complete the full claim flow.' };
  if (msg.includes('link not found'))
    return { title: 'Link not found', description: 'This payment link does not exist in the contract. It may have been refunded or never created.' };
  if (msg.includes('nullifier already used'))
    return { title: 'Already claimed', description: 'This payment link has already been claimed with a different wallet.' };
  if (msg.includes('insufficient balance'))
    return { title: 'Insufficient funds', description: rawMsg };
  if (msg.includes('recipient account') || msg.includes('funded'))
    return { title: 'Wallet not funded', description: 'Your account needs testnet XLM. Get free funds via the Stellar friendbot.' };
  if (msg.includes('failed to simulate'))
    return { title: 'Contract simulation failed', description: 'The transaction simulation failed. The link may be invalid or the contract is unavailable.' };
  if (msg.includes('attestation tx failed') || msg.includes('attestation tx rejected'))
    return { title: 'Attestation transaction failed', description: 'The attestation could not be recorded on-chain. The link may already be claimed, or the network is unavailable. Please try again.' };
  if (msg.includes('attestation request failed') || msg.includes('attestation failed'))
    return { title: 'Attestation service error', description: 'The backend attestation service encountered an error. Please try again later.' };

  // Fallback: show the original error but trimmed
  return { title: 'Claim failed', description: err?.message || 'An unexpected error occurred. Please try again.' };
}

const parseLinkInput = () => {
    const hash = linkInput.split('#')[1];
    if (hash) {
      setSecretHex(hash);
      setLinkInput('');
    }
  };

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      setSecretHex(hash);
      const bytes = new Uint8Array(hash.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      crypto.subtle.digest('SHA-256', bytes).then((buf) => {
        const linkHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        recordEvent(linkHash, 'view');
      }).catch(() => {});
    }
  }, []);

  const handleClaim = async () => {
    try {
      setStatus('connecting');
      setErrorMsg('');
      setErrorKind('error');

      const recipient = await connectWallet();

      const secretBytes = new Uint8Array(secretHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      const linkHashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', secretBytes));
      const linkHashHex = Array.from(linkHashBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      recordEvent(linkHashHex, 'initiation');

      const alreadyClaimed = await checkLinkOnChain(linkHashHex);
      if (alreadyClaimed === true) {
        setErrorKind('info');
        setErrorMsg('Funds already claimed: This payment link has already been claimed. The funds are no longer available.');
        setStatus('error');
        return;
      }

      setStatus('generating_proof');
      const { proof, linkHashFieldHex, nullifierFieldHex } = await generateClaimProof(secretBytes, recipient);

      setStatus('attesting');
      const proofHex = bytesToHex(proof);

      // Compute email hash if this is an email-restricted link
      let recipientEmailHash: string | undefined;
      if (intendedEmail) {
        const emailHashBytes = new Uint8Array(await sha256Hash(intendedEmail));
        recipientEmailHash = Array.from(emailHashBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }

      await requestAttestation(linkHashHex, proofHex, recipient, linkHashFieldHex, nullifierFieldHex, recipientEmailHash);

      // Email verification: if the link was created for a specific email, check it matches
      if (intendedEmail) {
        const wallet = loadWallet();
        const authedEmail = wallet?.email;
        if (!authedEmail || authedEmail.toLowerCase().trim() !== intendedEmail.toLowerCase().trim()) {
          setErrorKind('error');
          setErrorMsg(`This link is intended for ${intendedEmail}. Please log in with that email to claim.`);
          setStatus('error');
          return;
        }
      }

      setStatus('claiming');
      const linkHash = new Uint8Array(await crypto.subtle.digest('SHA-256', secretBytes));

      const hash = await claimLinkTx(recipient, linkHash, secretBytes);
      setTxHash(hash);

      recordEvent(linkHashHex, 'claim');

      setStatus('success');
      localStorage.setItem('atreus_claimed', Date.now().toString());
      updateLinkStatus(secretHex, true, hash);
      // Read the actual amount from the contract for the recipient's dashboard
      const linkInfo = await readLinkInfo(linkHashHex);
      const displayAmount = linkInfo.amount || 'Claimed';
      // Save to recipient's storage so they can see their claimed links on dashboard
      saveClaimedLink({
        id: `received-${Date.now()}`,
        url: window.location.href,
        amount: displayAmount,
        secretHex,
        linkHashHex,
        createdAt: Date.now(),
        expiresAt: 0,
        claimed: true,
        txHash: hash,
      });
    } catch (err: any) {
      console.error(err);
      const friendly = getFriendlyErrorMessage(err);
      setErrorMsg(`${friendly.title}: ${friendly.description}`);
      // Categorize the error kind for different UI styling
      if (friendly.title === 'Funds already claimed' || friendly.title === 'Already claimed') {
        setErrorKind('info');
      } else if (friendly.title === 'Link expired') {
        setErrorKind('expired');
      } else {
        setErrorKind('error');
      }
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

            {intendedEmail && (
              <div className={`p-4 rounded-xl text-sm font-medium border ${
                walletEmail && walletEmail.toLowerCase().trim() === intendedEmail.toLowerCase().trim()
                  ? 'bg-green-50 border-green-100 text-green-700'
                  : 'bg-amber-50 border-amber-100 text-amber-700'
              }`}>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  Intended for: <strong>{intendedEmail}</strong>
                </p>
                {walletEmail && walletEmail.toLowerCase().trim() === intendedEmail.toLowerCase().trim() ? (
                  <p className="text-xs mt-1 text-green-600">✓ Your email matches!</p>
                ) : walletEmail ? (
                  <p className="text-xs mt-1 text-amber-600">You are logged in as {walletEmail}. Only {intendedEmail} can claim this link.</p>
                ) : (
                  <p className="text-xs mt-1 text-amber-600">Log in with {intendedEmail} to claim this link.</p>
                )}
              </div>
            )}

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

            {status === 'error' && (() => {
              if (errorKind === 'info') {
                return (
                  <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium p-4 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                      <span className="font-bold">Funds already claimed</span>
                    </div>
                    <p className="text-blue-600/80 pl-7">This payment link has already been claimed. The funds were transferred to the recipient.</p>
                    <div className="flex gap-3 pt-2 pl-7">
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                      >
                        Go to Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setStatus('idle');
                          setSecretHex('');
                          setErrorMsg('');
                          setErrorKind('error');
                          window.location.hash = '';
                        }}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                      >
                        Claim Another
                      </button>
                    </div>
                  </div>
                );
              }
              if (errorKind === 'expired') {
                return (
                  <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium p-4 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="font-bold">Link expired</span>
                    </div>
                    <p className="text-amber-600/80 pl-7">This payment link has expired. The funds have been returned to the sender.</p>
                  </div>
                );
              }
              return (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium p-3 rounded-xl">
                  {errorMsg}
                </div>
              );
            })()}

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
