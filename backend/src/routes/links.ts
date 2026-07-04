import { Router, Request, Response } from "express";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sha256Hex, verifyClaimProof } from "../lib/zk.js";
import { submitAttestation } from "../lib/stellar.js";

let circuit: any = undefined;
function getCircuit() {
  if (circuit) return circuit;
  const circuitPath =
    process.env.CIRCUIT_PATH ||
    resolve(dirname(fileURLToPath(import.meta.url)), "../../../circuits/target/secret.json");
  if (!existsSync(circuitPath)) {
    throw new Error(`Circuit file not found at ${circuitPath}`);
  }
  circuit = JSON.parse(readFileSync(circuitPath, "utf-8"));
  return circuit;
}

export const linkRoutes: Router = Router();

// POST /api/links - Create a new payment link
linkRoutes.post("/", async (req: Request, res: Response) => {
  const { creator, token, amount } = req.body;

  if (!creator || !amount) {
    res.status(400).json({ error: "Missing required fields: creator, amount" });
    return;
  }

  // TODO: Generate link hash, interact with Soroban contract
  const link = {
    id: crypto.randomUUID(),
    creator,
    token: token || "native",
    amount,
    claimed: false,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json(link);
});

// GET /api/links/:hash - Get link details
linkRoutes.get("/:hash", async (req: Request, res: Response) => {
  const { hash } = req.params;

  // TODO: Fetch from contract state
  res.json({
    hash,
    creator: "G...",
    amount: "1000",
    claimed: false,
  });
});

// POST /api/links/:hash/attest - ZK attestation-oracle endpoint.
// Verifies a real UltraHonk proof off-chain against public inputs the backend recomputes
// itself (not client-supplied ones), and if valid, submits a signed on-chain attestation
// that claim_link requires before releasing funds. See contracts/README.md.
linkRoutes.post("/:hash/attest", async (req: Request, res: Response) => {
  const hash = String(req.params.hash);
  const { recipient, secret, proof } = req.body;

  if (!recipient || !secret || !proof) {
    res.status(400).json({ error: "Missing recipient, secret, or proof" });
    return;
  }

  try {
    const secretBytes = Uint8Array.from(Buffer.from(secret, "hex"));
    const proofBytes = Uint8Array.from(Buffer.from(proof, "hex"));

    const computedHash = sha256Hex(secretBytes);
    if (computedHash.toLowerCase() !== hash.toLowerCase()) {
      res.status(400).json({ error: "secret does not match link_hash" });
      return;
    }

    const isValid = await verifyClaimProof(getCircuit().bytecode, proofBytes, secretBytes, recipient);
    if (!isValid) {
      res.status(400).json({ error: "ZK proof verification failed" });
      return;
    }

    const linkHashBytes = Uint8Array.from(Buffer.from(hash, "hex"));
    const txHash = await submitAttestation(linkHashBytes, recipient);

    res.json({ success: true, hash, recipient, attestationTx: txHash });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Attestation failed" });
  }
});
