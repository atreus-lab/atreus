import { Router, Request, Response } from "express";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sha256Hex, verifyClaimProof } from "../lib/zk.js";
import { submitAttestation } from "../lib/stellar.js";

let circuit: any = undefined;
function getCircuit() {
  if (circuit) return circuit;

  const candidates = [];

  if (process.env.CIRCUIT_PATH) {
    candidates.push(process.env.CIRCUIT_PATH);
  }

  const cwd = process.cwd();
  candidates.push(
    resolve(cwd, "circuits/target/secret.json"),
    resolve(cwd, "../circuits/target/secret.json"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../../../circuits/target/secret.json"),
  );

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      circuit = JSON.parse(readFileSync(candidate, "utf-8"));
      return circuit;
    }
  }

  throw new Error(
    `Circuit file not found. Tried:\n  ${candidates.join("\n  ")}`
  );
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

const HEX_64 = /^[0-9a-fA-F]{64}$/;
const FIELD_HEX = /^(0x)?[0-9a-fA-F]{64}$/;

// POST /api/links/:hash/attest - ZK attestation-oracle endpoint.
// Verifies a real UltraHonk proof off-chain against the public inputs the client
// supplies (recipient, link_hash, nullifier) — never the private secret — and if
// valid, submits a signed on-chain attestation that claim_link requires before
// releasing funds. See contracts/README.md.
linkRoutes.post("/:hash/attest", async (req: Request, res: Response) => {
  const hash = String(req.params.hash);
  const { recipient, proof, link_hash, nullifier, recipient_email_hash } = req.body;

  if (!recipient || !proof || !link_hash || !nullifier) {
    res.status(400).json({ error: "Missing recipient, proof, link_hash, or nullifier" });
    return;
  }

  if (!HEX_64.test(hash)) {
    res.status(400).json({ error: "Invalid link hash format" });
    return;
  }
  if (typeof link_hash !== "string" || !FIELD_HEX.test(link_hash)) {
    res.status(400).json({ error: "Invalid link_hash format" });
    return;
  }
  if (typeof nullifier !== "string" || !FIELD_HEX.test(nullifier)) {
    res.status(400).json({ error: "Invalid nullifier format" });
    return;
  }
  if (typeof proof !== "string" || !/^[0-9a-fA-F]+$/.test(proof)) {
    res.status(400).json({ error: "Invalid proof format" });
    return;
  }

  try {
    const proofBytes = Uint8Array.from(Buffer.from(proof, "hex"));

    const isValid = await verifyClaimProof(getCircuit().bytecode, proofBytes, recipient, link_hash, nullifier);
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
