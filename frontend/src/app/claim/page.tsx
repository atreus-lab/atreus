'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadWallet, getActiveWalletProvider } from '@/lib/wallet';
import { connectWallet, networkPassphrase, rpcServer, waitForTransaction } from '@/lib/stellar';
import { bytesToHex } from '@/lib/proof';
import { generateClaimProof, requestAttestation } from '@/lib/zk';
import { startEmailVerification, confirmEmailVerification } from '@/lib/emailVerify';
import { updateLinkStatus, checkLinkOnChain, saveClaimedLink, readLinkInfo } from '@/lib/links';
import ProofProgress from '@/components/ProofProgress';
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Link2, Mail, Shield } from 'lucide-react';
import { Address, Contract, TransactionBuilder, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';

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
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailChallenge, setEmailChallenge] = useState<string | null>(null);
  const [emailVerifyTo, setEmailVerifyTo] = useState<string | null>(null);
  const [rawEmailMessage, setRawEmailMessage] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null);

  const isGeneratingProof = status === 'generating_proof';

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

  async function handleStartEmailVerify() {
    if (!intendedEmail) return;
    setEmailBusy(true);
    setEmailError('');
    try {
      const result = await startEmailVerification(intendedEmail);
      setEmailChallenge(result.challenge);
      setEmailVerifyTo(result.verifyTo);
      setEmailVerified(false);
    } catch (err: any) {
      setEmailError(err?.message || 'Failed to start email verification');
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleConfirmEmailVerify() {
    if (!intendedEmail || !rawEmailMessage.trim()) return;
    setEmailBusy(true);
    setEmailError('');
    try {
      await confirmEmailVerification(intendedEmail, rawEmailMessage);
      setEmailVerified(true);
    } catch (err: any) {
      setEmailError(err?.message || 'Email verification failed');
      setEmailVerified(false);
    } finally {
      setEmailBusy(false);
    }
  }

  async function sha256Hash(str: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str.toLowerCase().trim());
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  }

  /** Map contract panic messages and network errors to user-friendly messages */
function getFriendlyErrorMessage(err: any): { title: string; description: string } {
  const rawMsg = err?.message || err?.toString() || '';
  const msg = rawMsg.toLowerCase();

  // ── Ordered checks: specific contract panics FIRST ──
  // These must come BEFORE the HostError/WasmVm trap block because when Soroban's
  // prepareTransaction fails it wraps the contract panic in a "HostError" that also
  // contains the outer function name ("claim_link"), which would trigger the generic
  // VM trap handler first and mask the real error.

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
  if (msg.includes('already claimed'))
    return { title: 'Funds already claimed', description: 'This payment link has already been claimed. The funds are no longer available.' };
  if (msg.includes('invalid relayer fee'))
    return { title: 'Configuration error', description: 'The relayer fee is invalid. Please contact support.' };
  if (msg.includes('relayer request failed'))
    return { title: 'Relay service error', description: 'The gasless relay service could not process the claim. Please try again later.' };

  // ── WasmVm / HostError trap fallback ──
  // When the contract VM crashes instead of cleanly panicking (e.g. UnreachableCodeReached
  // after a successful attestation check), we catch that here.  But specific panics
  // are already handled above.
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
    const hash = linkInput.split('#')[1]?.split(/[,;\s]/)[0];
    if (hash) {
      setSecretHex(hash);
      setLinkInput('');
    }
  };

  const getHashFromUrl = () => window.location.hash.substring(1).split(/[,;\s]/)[0];

  useEffect(() => {
    const hash = getHashFromUrl();
    if (hash) setSecretHex(hash);
  }, []);

  const handleClaim = async () => {
    try {
      setStatus('connecting');
      setErrorMsg('');
      setErrorKind('error');

      const recipient = await connectWallet();

      const secretBytes = new Uint8Array(secretHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

      // Quick on-chain check: if the link is already claimed, short-circuit immediately
      // instead of wasting time generating a ZK proof and attesting.
      const linkHashForCheck = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', secretBytes))
      ).map((b) => b.toString(16).padStart(2, '0')).join('');
      const alreadyClaimed = await checkLinkOnChain(linkHashForCheck);
      if (alreadyClaimed === true) {
        setErrorKind('info');
        setErrorMsg('Funds already claimed: This payment link has already been claimed. The funds are no longer available.');
        setStatus('error');
        return;
      }

      // Read link info while the entry still exists (claim_link deletes it from storage)
      const linkInfo = await readLinkInfo(linkHashForCheck);

      // Email-restricted links require DKIM ownership proof before attestation.
      if (intendedEmail) {
        const wallet = loadWallet();
        const authedEmail = wallet?.email;
        if (!authedEmail || authedEmail.toLowerCase().trim() !== intendedEmail.toLowerCase().trim()) {
          setErrorKind('error');
          setErrorMsg(`This link is intended for ${intendedEmail}. Please log in with that email to claim.`);
          setStatus('error');
          return;
        }
        if (!emailVerified) {
          setErrorKind('error');
          setErrorMsg('Prove email ownership (DKIM) before claiming. Use the verification panel above.');
          setStatus('error');
          return;
        }
      }

      setStatus('generating_proof');
      const { proof, linkHashHex, linkHashFieldHex, nullifierFieldHex } = await generateClaimProof(secretBytes, recipient);

      setStatus('attesting');
      const proofHex = bytesToHex(proof);
      // Compute email hash if this is an email-restricted link
      let recipientEmailHash: string | undefined;
      const emailHashBytes = intendedEmail
        ? new Uint8Array(await sha256Hash(intendedEmail))
        : new Uint8Array(32);
      if (intendedEmail) {
        recipientEmailHash = Array.from(emailHashBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }

      await requestAttestation(linkHashHex, proofHex, recipient, linkHashFieldHex, nullifierFieldHex, recipientEmailHash);

      setStatus('claiming');
      const linkHash = new Uint8Array(await crypto.subtle.digest('SHA-256', secretBytes));

      const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
      const relayerAddress = process.env.NEXT_PUBLIC_RELAYER_ADDRESS;
      const relayerFee = process.env.NEXT_PUBLIC_RELAYER_FEE_STROOPS;
      if (!contractId || !relayerAddress || !relayerFee) {
        throw new Error('Gasless claim configuration is incomplete.');
      }
      if (!/^\d+$/.test(relayerFee)) {
        throw new Error('invalid relayer fee');
      }

      const contract = new Contract(contractId);
      const claimOperation = contract.call(
        'claim_link',
        xdr.ScVal.scvBytes(Buffer.from(linkHash)),
        new Address(recipient).toScVal(),
        xdr.ScVal.scvBytes(Buffer.from(secretBytes)),
        xdr.ScVal.scvBytes(Buffer.from(emailHashBytes)),
        new Address(relayerAddress).toScVal(),
        nativeToScVal(BigInt(relayerFee), { type: 'i128' }),
      );

      const account = await rpcServer.getAccount(recipient);
      let transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase,
      })
        .addOperation(claimOperation)
        .setTimeout(120)
        .build();
      transaction = (await rpcServer.prepareTransaction(transaction)) as typeof transaction;

      const provider = getActiveWalletProvider();
      const signedXdr = await provider.signTransaction(transaction.toXDR());
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const relayResponse = await fetch(`${backendUrl}/api/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionXdr: signedXdr }),
      });
      const relayResult = await relayResponse.json().catch(() => null);
      if (!relayResponse.ok || typeof relayResult?.hash !== 'string') {
        throw new Error(relayResult?.error || 'Relayer request failed.');
      }

      const hash = relayResult.hash;
      await waitForTransaction(hash, { timeoutMs: 30_000 });
      setTxHash(hash);

      setStatus('success');
      localStorage.setItem('atreus_claimed', Date.now().toString());
      updateLinkStatus(secretHex, true, hash);
      // Read the actual amount from the contract for the recipient's dashboard
      const displayAmount = linkInfo.amount || 'Claimed';
      setClaimedAmount(linkInfo.amount);
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
        counterpartyAddress: linkInfo.creator || undefined,
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
    attesting: 'Please Wait…',
    claiming: 'Claiming Funds...',
    success: 'Claimed!',
    error: 'Try Again',
  };

  const isDisabled =
    status === 'connecting' ||
    status === 'generating_proof' ||
    status === 'attesting' ||
    status === 'claiming' ||
    (Boolean(intendedEmail) && !emailVerified);

  return (
    <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ateruslogo.svg" alt="Atreus logo" width={32} height={32} className="h-8 w-8 object-contain" />
          <span
            className="text-[22px] font-extrabold tracking-tight text-black"
            style={{ fontFamily: 'var(--font-manrope), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            Atreus
          </span>
        </div>

        <div className="w-full rounded-2xl border border-grey-100 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-grey-700 transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          <h2 className="text-lg font-bold text-grey-800 mobile:text-[26px]">Claim Link</h2>

          {secretHex ? (
            <>
              <p className="mt-1.5 text-sm text-grey-700">
                A payment has been found! Verify your identity with a ZK proof to claim it.
              </p>

              {intendedEmail && (
                <div className="mt-4 space-y-3">
                  <div className={`rounded-xl border p-4 text-sm font-medium ${
                    walletEmail && walletEmail.toLowerCase().trim() === intendedEmail.toLowerCase().trim()
                      ? 'border-success/20 bg-success/10 text-grey-800'
                      : 'border-amber-100 bg-amber-50 text-amber-700'
                  }`}>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      Intended for: <strong>{intendedEmail}</strong>
                    </p>
                    {walletEmail && walletEmail.toLowerCase().trim() === intendedEmail.toLowerCase().trim() ? (
                      <p className="mt-1 text-xs font-semibold text-success">Your email matches!</p>
                    ) : walletEmail ? (
                      <p className="mt-1 text-xs text-amber-600">You are logged in as {walletEmail}. Only {intendedEmail} can claim this link.</p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-600">Log in with {intendedEmail} to claim this link.</p>
                    )}
                  </div>

                  <div className="space-y-3 rounded-xl border border-grey-100 bg-grey-25 p-4 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-grey-800">
                      <Shield className="h-4 w-4 text-primaryBlue" />
                      DKIM email ownership verification
                    </p>
                    {emailVerified ? (
                      <p className="text-xs font-semibold text-success">
                        Email ownership verified. You can claim this link.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs leading-relaxed text-grey-500">
                          Prove you control this address by sending a DKIM-signed message that includes a challenge token, then paste the raw email source below.
                        </p>
                        {!emailChallenge ? (
                          <button
                            type="button"
                            disabled={emailBusy}
                            onClick={handleStartEmailVerify}
                            className="h-11 w-full rounded-lg bg-primaryBlue text-xs font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50"
                          >
                            {emailBusy ? 'Starting…' : 'Start email verification'}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs leading-relaxed text-grey-500">
                              Send mail from <strong className="text-grey-800">{intendedEmail}</strong>
                              {emailVerifyTo ? <> to <strong className="text-grey-800">{emailVerifyTo}</strong></> : null}
                              {' '}with challenge token:
                            </p>
                            <code className="block break-all rounded-lg border border-grey-100 bg-white p-2 text-[11px] font-mono text-grey-800">
                              {emailChallenge}
                            </code>
                            <textarea
                              value={rawEmailMessage}
                              onChange={(e) => setRawEmailMessage(e.target.value)}
                              placeholder="Paste full raw email source (including DKIM-Signature header)…"
                              rows={5}
                              className="w-full rounded-lg border border-grey-100 p-2.5 text-xs font-mono text-grey-800 outline-none transition-colors focus:border-primaryBlue"
                            />
                            <button
                              type="button"
                              disabled={emailBusy || !rawEmailMessage.trim()}
                              onClick={handleConfirmEmailVerify}
                              className="h-11 w-full rounded-lg bg-primaryBlue text-xs font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50"
                            >
                              {emailBusy ? 'Verifying DKIM…' : 'Confirm with raw message'}
                            </button>
                          </div>
                        )}
                        {emailError && (
                          <p className="text-xs font-semibold text-error">{emailError}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {isGeneratingProof && <ProofProgress />}

                {status === 'attesting' && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying proof and recording attestation on Stellar...
                  </div>
                )}

                {status === 'connecting' && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting wallet...
                  </div>
                )}

                {status === 'claiming' && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Claiming funds on-chain...
                  </div>
                )}

                {status === 'error' && (() => {
                if (errorKind === 'info') {
                  return (
                    <div className="space-y-1 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-primaryBlue" />
                        <span className="font-bold">Funds already claimed</span>
                      </div>
                      <p className="pl-7 text-blue-600/80">This payment link has already been claimed. The funds were transferred to the recipient.</p>
                      <div className="flex gap-3 pt-2 pl-7">
                        <button
                          onClick={() => router.push('/dashboard')}
                          className="text-sm font-bold text-blue-600 underline underline-offset-2 transition-opacity hover:opacity-70"
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
                          className="text-sm font-bold text-blue-600 underline underline-offset-2 transition-opacity hover:opacity-70"
                        >
                          Claim Another
                        </button>
                      </div>
                    </div>
                  );
                }
                if (errorKind === 'expired') {
                  return (
                    <div className="space-y-1 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-700">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 shrink-0 text-amber-500" />
                        <span className="font-bold">Link expired</span>
                      </div>
                      <p className="pl-7 text-amber-600/80">This payment link has expired. The funds have been returned to the sender.</p>
                    </div>
                  );
                }
                return (
                  <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-error">
                    {errorMsg}
                  </div>
                );
              })()}
              </div>

              {status !== 'success' && (
                <button
                  disabled={isDisabled}
                  onClick={handleClaim}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primaryBlue text-sm font-bold text-white transition-all hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isDisabled ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {statusText[status]}
                    </>
                  ) : (
                    statusText[status]
                  )}
                </button>
              )}

              {status === 'success' && (
                <div className="mt-6 flex flex-col items-center space-y-4 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-grey-800">Payment Claimed</p>
                    <p className="mt-1 text-sm text-grey-500">
                      {claimedAmount ? `${claimedAmount} XLM added to your wallet` : "Funds transferred to your wallet"}
                    </p>
                  </div>
                  {txHash && (
                    <div className="flex items-center gap-2 rounded-lg border border-grey-100 bg-grey-25 px-3 py-2">
                      <span className="font-mono text-xs text-grey-600">{txHash.slice(0, 20)}...</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(txHash)}
                        className="text-xs font-bold text-primaryBlue transition-opacity hover:opacity-70"
                        title="Copy transaction hash"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setStatus('idle');
                        setSecretHex('');
                        setErrorMsg('');
                        setTxHash('');
                        setClaimedAmount(null);
                        window.location.hash = '';
                      }}
                      className="flex h-11 items-center rounded-lg border border-[#E0E7EB] px-4 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-50"
                    >
                      Claim Another
                    </button>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="flex h-11 items-center rounded-lg bg-primaryBlue px-4 text-sm font-bold text-white transition-colors hover:bg-blue-600 active:bg-blue-700"
                    >
                      Dashboard
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-5 py-4">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primaryBlue">
                  <Link2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-grey-500">
                  Paste a payment link to claim the funds.
                </p>
              </div>
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && parseLinkInput()}
                placeholder="https://localhost:3000/claim#..."
                className="w-full rounded-lg border border-grey-100 p-3.5 text-sm font-medium text-grey-800 outline-none transition-colors focus:border-primaryBlue focus:ring-4 focus:ring-primaryBlue/10"
              />
              <button
                onClick={parseLinkInput}
                disabled={!linkInput.includes('#')}
                className="h-11 w-full rounded-lg bg-primaryBlue text-sm font-bold text-white transition-all hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start Claim
              </button>
              <Link
                href="/"
                className="block text-center text-sm font-bold text-primaryBlue transition-opacity hover:opacity-70"
              >
                Go Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
