import { Router, Request, Response } from "express";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sha256Hex, verifyClaimProof } from "../lib/zk.js";
import { createBatchEscrowTransaction, submitAttestation } from "../lib/stellar.js";
import { batchResultsCsv, createBatchRecord, parseBatchCsv, processBatch, type BatchRecord } from "../lib/batch.js";
import pino from "pino";

let circuit: any = undefined;

/**
 * Load the compiled Noir circuit (secret.json) — tries local filesystem paths
 * first, then falls back to fetching from the frontend server (where the circuit
 * is served as a static asset at /circuits/secret.json). The frontend fallback
 * is needed on Vercel serverless where includeFiles may not reliably place
 * the circuit file into the function root.
 */
async function getCircuit(): Promise<any> {
  if (circuit) return circuit;

  // 1. Try local filesystem paths (local dev, self-hosted)
  const candidates: string[] = [];

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

  // 2. Fallback — fetch from the frontend URL (works on Vercel where the
  //    circuit is deployed as a static asset in the frontend's public dir)
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    try {
      const resp = await fetch(`${frontendUrl.replace(/\/$/, "")}/circuits/secret.json`);
      if (resp.ok) {
        circuit = await resp.json();
        return circuit;
      }
    } catch (e: any) {
      logger.warn({ error: e?.message }, "Failed to fetch circuit from FRONTEND_URL");
    }
  }

  throw new Error(
    `Circuit file not found (tried filesystem and FRONTEND_URL). Tried:\n  ${candidates.join("\n  ")}`
  );
}

export const linkRoutes: Router = Router();
const batches = new Map<string, BatchRecord>();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// POST /api/links/batch - Validate and enqueue a CSV batch. The body remains JSON so
// clients can send the exact CSV text without a multipart parsing dependency.
linkRoutes.post("/batch", async (req: Request, res: Response) => {
  const correlationId = String(req.header("x-correlation-id") || crypto.randomUUID());
  try {
    const creator = typeof req.body?.creator === "string" ? req.body.creator : "";
    const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
    if (!creator || !csv) {
      res.status(400).json({ error: "Missing required fields: creator, csv", correlationId });
      return;
    }
    const rows = parseBatchCsv(csv);
    const batch = createBatchRecord(creator, correlationId, rows);
    batches.set(batch.id, batch);
    logger.info({ correlationId, batchId: batch.id, creator, rowCount: rows.length, totalAmount: batch.totalAmount }, "batch queued");
    const origin = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
    setImmediate(() => {
      processBatch(batch, async (row, secret) => {
        const hash = Buffer.from(sha256Hex(secret), "hex");
        logger.info({ correlationId, batchId: batch.id, row: row.row }, "processing batch row");
        return createBatchEscrowTransaction(creator, row, hash);
      }, origin).then(() => {
        logger.info({ correlationId, batchId: batch.id, successCount: batch.successCount, failureCount: batch.failureCount }, "batch completed");
      }).catch((error) => {
        logger.error({ correlationId, batchId: batch.id, error }, "batch processor failed");
      });
    });
    res.status(202).json({ batchId: batch.id, correlationId, status: batch.status, totalRows: rows.length, totalAmount: batch.totalAmount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid CSV";
    logger.warn({ correlationId, error: message }, "batch rejected");
    res.status(400).json({ error: message, correlationId });
  }
});

// Polling endpoint for progress and per-row error reporting.
linkRoutes.get("/batch/:batchId", (req: Request, res: Response) => {
  const batch = batches.get(String(req.params.batchId));
  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }
  res.json(batch);
});

linkRoutes.get("/batch/:batchId/results.csv", (req: Request, res: Response) => {
  const batch = batches.get(String(req.params.batchId));
  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }
  if (batch.status !== "completed") {
    res.status(409).json({ error: "Batch is not complete" });
    return;
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="batch-${batch.id}-results.csv"`);
  res.send(batchResultsCsv(batch));
});

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

  let emailHashBytes: Uint8Array | undefined;
  if (recipient_email_hash && typeof recipient_email_hash === "string" && recipient_email_hash.length === 64) {
    emailHashBytes = Uint8Array.from(Buffer.from(recipient_email_hash, "hex"));
  }

  try {
    console.error("DEBUG recipient:", recipient, "link_hash:", link_hash?.slice(0, 20), "nullifier:", nullifier?.slice(0, 20));
    const proofBytes = Uint8Array.from(Buffer.from(proof, "hex"));

    const circuit = await getCircuit();
    const isValid = await verifyClaimProof(circuit.bytecode, proofBytes, recipient, link_hash, nullifier);
    if (!isValid) {
      res.status(400).json({ error: "ZK proof verification failed" });
      return;
    }

    const linkHashBytes = Uint8Array.from(Buffer.from(hash, "hex"));
    const txHash = await submitAttestation(linkHashBytes, recipient, emailHashBytes);

    res.json({ success: true, hash, recipient, attestationTx: txHash });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Attestation failed" });
  }
});
