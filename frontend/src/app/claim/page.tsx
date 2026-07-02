"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { connectWallet, claimLinkTx } from "@/lib/stellar";
import { bytesToHex } from "@/lib/proof";
import { generateClaimProof, requestAttestation } from "@/lib/zk";

type ClaimStatus =
  | "idle"
  | "connecting"
  | "generating_proof"
  | "attesting"
  | "claiming"
  | "success"
  | "error";

export default function ClaimPage() {
  const [secretHex, setSecretHex] = useState("");
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) setSecretHex(hash);
  }, []);

  const handleClaim = async () => {
    try {
      setStatus("connecting");
      setErrorMsg("");

      const recipient = await connectWallet();

      const secretBytes = new Uint8Array(
        secretHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
      );

      // Step 1: Generate real UltraHonk ZK proof client-side
      setStatus("generating_proof");
      const { proof, linkHashHex } = await generateClaimProof(
        secretBytes,
        recipient
      );

      // Step 2: Send proof to backend attester for off-chain verification + on-chain attestation
      setStatus("attesting");
      const proofHex = bytesToHex(proof);
      await requestAttestation(
        linkHashHex,
        secretHex,
        proofHex,
        recipient
      );

      // Step 3: Claim funds — contract now checks both sha256(secret)==link_hash AND is_attested()
      setStatus("claiming");
      const linkHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", secretBytes)
      );
      const hash = await claimLinkTx(recipient, linkHash, secretBytes);
      setTxHash(hash);

      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Claim failed");
      setStatus("error");
    }
  };

  const statusText: Record<ClaimStatus, string> = {
    idle: "Claim with ZK Proof",
    connecting: "Connecting Wallet...",
    generating_proof: "Generating ZK Proof...",
    attesting: "Verifying Proof & Attesting...",
    claiming: "Claiming Funds...",
    success: "Claimed!",
    error: "Try Again",
  };

  const isDisabled =
    status === "connecting" ||
    status === "generating_proof" ||
    status === "attesting" ||
    status === "claiming";

  return (
    <div className="card text-centered">
      <h2 className="card-title">Claim Link</h2>

      {secretHex ? (
        <div className="card-flush">
          <p className="card-body">
            A payment has been found! Verify your identity to claim it.
          </p>

          {status === "generating_proof" && (
            <div className="status-badge">
              Generating a real UltraHonk ZK proof — this may take a moment...
            </div>
          )}

          {status === "attesting" && (
            <div className="status-badge">
              Proof generated! Verifying off-chain and recording attestation on Stellar...
            </div>
          )}

          {status === "error" && (
            <div className="status-error">{errorMsg}</div>
          )}

          <button
            disabled={isDisabled}
            onClick={handleClaim}
            className="btn-claim"
          >
            {statusText[status]}
          </button>
        </div>
      ) : (
        <p className="status-error">
          No secret found in URL. Please use a valid link.
        </p>
      )}

      {status === "success" && (
        <div className="status-success">
          <p>Funds have been transferred to your wallet!</p>
          {txHash && (
            <p style={{ fontSize: "0.75rem", marginTop: "0.5rem", opacity: 0.7 }}>
              TX: {txHash.substring(0, 16)}...
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", justifyContent: "center" }}>
            <Link href="/create" className="btn-secondary">
              Create Another Link
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
