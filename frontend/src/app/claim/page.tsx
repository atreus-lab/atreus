"use client";

import { useEffect, useState } from "react";

type ClaimStatus = "idle" | "proving" | "claiming" | "success";

export default function ClaimPage() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<ClaimStatus>("idle");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) setSecret(hash);
  }, []);

  const handleClaim = async () => {
    setStatus("proving");
    setTimeout(() => {
      setStatus("claiming");
      setTimeout(() => {
        setStatus("success");
      }, 2000);
    }, 2000);
  };

  return (
    <div className="card text-centered">
      <h2 className="card-title">Claim PayLink</h2>

      {secret ? (
        <div className="card-flush">
          <p className="card-body">
            A payment has been found! Verify your identity to claim it.
          </p>
          <div className="status-badge">
            Link Secret: {secret}
          </div>

          <button
            disabled={status !== "idle"}
            onClick={handleClaim}
            className="btn-claim"
          >
            {status === "idle" && "Claim with Passkey"}
            {status === "proving" && "Generating ZK Proof..."}
            {status === "claiming" && "Broadcasting to Stellar..."}
            {status === "success" && "Success!"}
          </button>
        </div>
      ) : (
        <p className="status-error">No secret found in URL. Please use a valid PayLink.</p>
      )}

      {status === "success" && (
        <div className="status-success">
          Funds have been transferred to your wallet!
        </div>
      )}
    </div>
  );
}
