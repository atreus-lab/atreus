'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadWallet } from '@/lib/wallet';
import { connectWallet, claimLinkTx, claimAndSwapLinkTx } from '@/lib/stellar';
import { bytesToHex } from '@/lib/proof';
import { generateClaimProof, requestAttestation } from '@/lib/zk';
import { updateLinkStatus, checkLinkOnChain, saveClaimedLink, readLinkInfo } from '@/lib/links';
import { recordEvent } from '@/lib/analytics';
import {
  SUPPORTED_CLAIM_TOKENS,
  getSwapPath,
  type TokenInfo,
  type SwapPathResult,
} from '@/lib/soroswap';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Link2,
  Mail,
  ArrowRightLeft,
  Sliders,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

type ClaimStatus =
  | 'idle'
  | 'connecting'
  | 'generating_proof'
  | 'attesting'
  | 'claiming'
  | 'success'
  | 'error';

function tokenBadge(code: string) {
  const colors: Record<string, string> = {
    XLM: 'bg-black text-white',
    USDC: 'bg-blue-600 text-white',
    EURC: 'bg-emerald-600 text-white',
  };
  return colors[code] || 'bg-slate-800 text-white';
}

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
  const [escrowAmount, setEscrowAmount] = useState<string>('100');
  const [targetToken, setTargetToken] = useState<TokenInfo>(SUPPORTED_CLAIM_TOKENS[0]);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [showSlippageSettings, setShowSlippageSettings] = useState<boolean>(false);
  const [swapEstimate, setSwapEstimate] = useState<SwapPathResult | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [receivedSummary, setReceivedSummary] = useState<string>('');

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

    // ── Ordered checks: specific contract panics FIRST ──
    if (msg.includes('swap output less than min_amount_out') || msg.includes('slippage'))
      return {
        title: 'Slippage exceeded',
        description:
          'The swap output was lower than your minimum expected amount. The transaction was reverted cleanly without burning your nullifier. Try increasing slippage tolerance or claiming in XLM.',
      };
    if (msg.includes('invalid swap path'))
      return {
        title: 'Invalid swap route',
        description:
          'The selected swap path could not be routed by Soroswap Router. Please try another asset.',
      };
    if (msg.includes('invalid secret'))
      return {
        title: 'Invalid link',
        description: 'The secret key for this link is incorrect. Please check the link and try again.',
      };
    if (msg.includes('link expired') || msg.includes('expired'))
      return {
        title: 'Link expired',
        description: 'This payment link has expired and can no longer be claimed.',
      };
    if (msg.includes('no valid zk attestation'))
      return {
        title: 'Proof verification pending',
        description:
          'The ZK proof attestation has not been recorded yet. Please complete the full claim flow.',
      };
    if (msg.includes('link not found'))
      return {
        title: 'Link not found',
        description:
          'This payment link does not exist in the contract. It may have been refunded or never created.',
      };
    if (msg.includes('nullifier already used'))
      return {
        title: 'Already claimed',
        description: 'This payment link has already been claimed with a different wallet.',
      };
    if (msg.includes('already claimed'))
      return {
        title: 'Funds already claimed',
        description:
          'This payment link has already been claimed. The funds are no longer available.',
      };
    if (msg.includes('email not attested'))
      return {
        title: 'Email verification failed',
        description:
          'This link is restricted to a specific email address. Please log in with the correct email to claim.',
      };
    if (msg.includes('untrusted attester'))
      return {
        title: 'Attestation rejected',
        description:
          'The attestation could not be recorded because the attester key is not authorized. Please contact support.',
      };
    if (msg.includes('verifier not set'))
      return {
        title: 'Configuration error',
        description:
          'The contract is not properly configured with a verifier address. Please contact support.',
      };

    if (
      msg.includes('wasmvm') ||
      msg.includes('invalidaction') ||
      msg.includes('unreachablecodereached') ||
      msg.includes('vm call trapped') ||
      (msg.includes('hosterror') && msg.includes('claim'))
    ) {
      if (msg.includes('fn_return') && msg.includes('is_attested') && msg.includes('true')) {
        return {
          title: 'Funds already claimed',
          description:
            'This payment link has already been claimed. The funds are no longer available.',
        };
      }
      return {
        title: 'Contract error',
        description:
          'The transaction could not be completed. This link may have already been claimed or is invalid. Please check the link and try again.',
      };
    }

    if (msg.includes('insufficient balance'))
      return { title: 'Insufficient funds', description: rawMsg };
    if (msg.includes('recipient account') || msg.includes('funded'))
      return {
        title: 'Wallet not funded',
        description: 'Your account needs testnet XLM. Get free funds via the Stellar friendbot.',
      };
    if (msg.includes('failed to simulate'))
      return {
        title: 'Contract simulation failed',
        description: 'The transaction simulation failed. The link may be invalid or the contract is unavailable.',
      };
    if (msg.includes('attestation tx failed') || msg.includes('attestation tx rejected'))
      return {
        title: 'Attestation transaction failed',
        description:
          'The attestation could not be recorded on-chain. The link may already be claimed, or the network is unavailable. Please try again.',
      };
    if (msg.includes('attestation request failed') || msg.includes('attestation failed'))
      return {
        title: 'Attestation service error',
        description: 'The backend attestation service encountered an error. Please try again later.',
      };

    return {
      title: 'Claim failed',
      description: err?.message || 'An unexpected error occurred. Please try again.',
    };
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
        const linkHash = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        recordEvent(linkHash, 'view');
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!secretHex) return;
    const bytes = new Uint8Array(secretHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    crypto.subtle.digest('SHA-256', bytes).then(async (buf) => {
      const linkHashHex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const info = await readLinkInfo(linkHashHex);
      if (info.amount) {
        setEscrowAmount(info.amount);
      }
    }).catch(() => {});
  }, [secretHex]);

  useEffect(() => {
    if (targetToken.code === 'XLM') {
      setSwapEstimate(null);
      setIsEstimating(false);
      return;
    }

    let active = true;
    setIsEstimating(true);

    const timer = setTimeout(async () => {
      try {
        const result = await getSwapPath('XLM', targetToken.code, escrowAmount || '100', slippage);
        if (active) {
          setSwapEstimate(result);
        }
      } catch (e) {
        console.warn('Failed to estimate swap path:', e);
      } finally {
        if (active) setIsEstimating(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [targetToken, escrowAmount, slippage]);

  const handleSlippageChange = (value: number) => {
    setSlippage(value);
    setCustomSlippage('');
  };

  const handleCustomSlippageChange = (valStr: string) => {
    setCustomSlippage(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
      setSlippage(parsed);
    }
  };

  const handleClaim = async () => {
    try {
      setStatus('connecting');
      setErrorMsg('');
      setErrorKind('error');

      const recipient = await connectWallet();
      const secretBytes = new Uint8Array(secretHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

      const linkHashForAnalytics = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', secretBytes))
      ).map((b) => b.toString(16).padStart(2, '0')).join('');
      recordEvent(linkHashForAnalytics, 'initiation');

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

      setStatus('generating_proof');
      const { proof, linkHashHex, linkHashFieldHex, nullifierFieldHex } = await generateClaimProof(
        secretBytes,
        recipient
      );

      setStatus('attesting');
      const proofHex = bytesToHex(proof);

      let recipientEmailHash: string | undefined;
      if (intendedEmail) {
        const emailHashBytes = new Uint8Array(await sha256Hash(intendedEmail));
        recipientEmailHash = Array.from(emailHashBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }

      await requestAttestation(
        linkHashHex,
        proofHex,
        recipient,
        linkHashFieldHex,
        nullifierFieldHex,
        recipientEmailHash
      );

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

      let emailHashBytes: Uint8Array | undefined;
      if (intendedEmail) {
        emailHashBytes = new Uint8Array(await sha256Hash(intendedEmail));
      }

      let hash = '';
      let claimedDisplayAmount = escrowAmount;
      let claimedDisplayToken = 'XLM';

      if (targetToken.code === 'XLM') {
        // Standard claim without swap
        hash = await claimLinkTx(recipient, linkHash, secretBytes, emailHashBytes);
        claimedDisplayAmount = escrowAmount;
        claimedDisplayToken = 'XLM';
      } else {
        // Claim and swap via Soroswap Router cross-contract call
        const swapPath =
          swapEstimate || (await getSwapPath('XLM', targetToken.code, escrowAmount, slippage));
        const correlationId = crypto.getRandomValues(new Uint8Array(32));

        hash = await claimAndSwapLinkTx(
          recipient,
          linkHash,
          secretBytes,
          swapPath.routerAddress,
          swapPath.path,
          swapPath.minAmountOutStroops,
          undefined,
          correlationId,
          emailHashBytes
        );
        claimedDisplayAmount = swapPath.expectedAmountOut;
        claimedDisplayToken = targetToken.code;
      }

      setTxHash(hash);
      setReceivedSummary(`${claimedDisplayAmount} ${claimedDisplayToken}`);
      recordEvent(linkHashHex, 'claim');

      setStatus('success');
      localStorage.setItem('atreus_claimed', Date.now().toString());
      updateLinkStatus(secretHex, true, hash);

      saveClaimedLink({
        id: `received-${Date.now()}`,
        url: window.location.href,
        amount: `${claimedDisplayAmount} ${claimedDisplayToken}`,
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

  const isSwapping = targetToken.code !== 'XLM';
  const statusText: Record<ClaimStatus, string> = {
    idle: isSwapping ? `Claim & Swap to ${targetToken.code}` : 'Claim with ZK Proof',
    connecting: 'Connecting Wallet...',
    generating_proof: 'Generating ZK Proof...',
    attesting: 'Verifying Proof & Attesting...',
    claiming: isSwapping ? `Swapping to ${targetToken.code}...` : 'Claiming Funds...',
    success: isSwapping ? `Swapped to ${targetToken.code}!` : 'Claimed!',
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

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Claim Link</h2>
          {escrowAmount && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {escrowAmount} XLM Escrowed
            </span>
          )}
        </div>

        {secretHex ? (
          <>
            <p className="text-sm text-slate-500">
              A payment has been found! Verify your identity with a ZK proof to claim or swap it directly to your preferred token.
            </p>

            {intendedEmail && (
              <div
                className={`p-4 rounded-xl text-sm font-medium border ${
                  walletEmail && walletEmail.toLowerCase().trim() === intendedEmail.toLowerCase().trim()
                    ? 'bg-green-50 border-green-100 text-green-700'
                    : 'bg-amber-50 border-amber-100 text-amber-700'
                }`}
              >
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  Intended for: <strong>{intendedEmail}</strong>
                </p>
                {walletEmail &&
                walletEmail.toLowerCase().trim() === intendedEmail.toLowerCase().trim() ? (
                  <p className="text-xs mt-1 text-green-600">✓ Your email matches!</p>
                ) : walletEmail ? (
                  <p className="text-xs mt-1 text-amber-600">
                    You are logged in as {walletEmail}. Only {intendedEmail} can claim this link.
                  </p>
                ) : (
                  <p className="text-xs mt-1 text-amber-600">
                    Log in with {intendedEmail} to claim this link.
                  </p>
                )}
              </div>
            )}

            {/* Target Token Selector & Swap Configuration */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" /> Receive As
                </span>
                <button
                  type="button"
                  onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  {slippage}% Slippage
                </button>
              </div>

              {/* Token Options */}
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_CLAIM_TOKENS.map((tok) => {
                  const isSelected = targetToken.code === tok.code;
                  return (
                    <button
                      key={tok.code}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setTargetToken(tok)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center ${
                        isSelected
                          ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full ${tokenBadge(
                          tok.code
                        )} flex items-center justify-center text-[10px] font-bold mb-1`}
                      >
                        {tok.code.slice(0, 2)}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{tok.code}</span>
                      <span className="text-[10px] text-slate-400 truncate w-full">{tok.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Slippage Settings Panel (Collapsible) */}
              {showSlippageSettings && (
                <div className="pt-2 border-t border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Slippage Tolerance</span>
                    <span className="font-bold text-indigo-600">{slippage}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0.5, 1.0, 2.0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSlippageChange(preset)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          slippage === preset && !customSlippage
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        placeholder="Custom"
                        value={customSlippage}
                        onChange={(e) => handleCustomSlippageChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600 pr-5"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Swap Route & Minimum Output Preview */}
              {isSwapping && (
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Estimated Output:
                    </span>
                    <span className="font-bold text-indigo-900 text-sm">
                      {isEstimating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin inline text-indigo-600" />
                      ) : swapEstimate ? (
                        `≈ ${swapEstimate.expectedAmountOut} ${targetToken.code}`
                      ) : (
                        `— ${targetToken.code}`
                      )}
                    </span>
                  </div>
                  {swapEstimate && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-indigo-100/60">
                      <span>Min. received ({slippage}% slippage):</span>
                      <span className="font-semibold text-slate-700">
                        {swapEstimate.minAmountOut} {targetToken.code}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Route:</span>
                    <span className="font-mono text-indigo-700">XLM → {targetToken.code} (Soroswap Router)</span>
                  </div>
                </div>
              )}
            </div>

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
                {isSwapping ? `Claiming and swapping into ${targetToken.code} on-chain...` : 'Claiming funds on-chain...'}
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
                    <p className="text-blue-600/80 pl-7">
                      This payment link has already been claimed. The funds were transferred to the recipient.
                    </p>
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
                    <p className="text-amber-600/80 pl-7">
                      This payment link has expired. The funds have been returned to the sender.
                    </p>
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
                  {isSwapping
                    ? `Successfully swapped and transferred ${receivedSummary} to your wallet!`
                    : 'Funds transferred to your wallet!'}
                </p>
                {txHash && (
                  <p className="text-xs text-slate-400 font-mono">TX: {txHash.substring(0, 16)}...</p>
                )}
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setSecretHex('');
                      setErrorMsg('');
                      setTxHash('');
                      setReceivedSummary('');
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
                Paste a payment link to claim or swap the funds.
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
