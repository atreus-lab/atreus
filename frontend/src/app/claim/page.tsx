"use client";

import { useEffect, useState } from "react";
import { connectWallet, claimLinkTx, submitProofTx } from "@/lib/stellar";
import { MOCK_ULTRAHONK_PROOF, hexToBytes } from "@/lib/proof";

type ClaimStatus = "idle" | "connecting" | "submitting_proof" | "claiming" | "success" | "error";

export default function ClaimPage() {
  const [secretHex, setSecretHex] = useState("");
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
        secretHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
      );

      const linkHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", secretBytes)
      );

      // Step 1: Submit ZK proof to VerifierContract
      setStatus("submitting_proof");
      await submitProofTx(recipient, hexToBytes(MOCK_ULTRAHONK_PROOF));

      // Step 2: Claim funds from AtreusContract
      setStatus("claiming");
      await claimLinkTx(recipient, linkHash, secretBytes);

      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Claim failed");
      setStatus("error");
    }
  };

  return (
    <div className="card text-centered">
      <h2 className="card-title">Claim Link</h2>

      {secretHex ? (
        <div className="card-flush">
          <p className="card-body">
            A payment has been found! Verify your identity to claim it.
          </p>

          {status === "error" && (
            <div className="status-error mb-4">{errorMsg}</div>
          )}

          <button
            disabled={status === "submitting_proof" || status === "claiming" || status === "connecting"}
            onClick={handleClaim}
            className="btn-claim"
          >
            {status === "idle" && "Claim with ZK Proof"}
            {status === "connecting" && "Connecting Wallet..."}
            {status === "submitting_proof" && "Submitting ZK Proof..."}
            {status === "claiming" && "Claiming Funds..."}
            {status === "success" && "Success!"}
            {status === "error" && "Try Again"}
          </button>
        </div>
      ) : (
        <p className="status-error">No secret found in URL. Please use a valid link.</p>
      )}

      {status === "success" && (
        <div className="status-success">
          Funds have been transferred to your wallet!
        </div>
      )}
    </div>
  );
}
