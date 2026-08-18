import { Router, Request, Response } from "express";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sha256Hex, verifyClaimProof } from "../lib/zk.js";
import { createBatchEscrowTransaction, submitAttestation, getLinkInfo, checkNullifierOnChain, markNullifierOnChain } from "../lib/stellar.js";
import { batchResultsCsv, createBatchRecord, parseBatchCsv, processBatch, type BatchRecord } from "../lib/batch.js";
import { saveBatch, listBatches } from "../lib/batchStore.js";
import { isEmailHashHex } from "../lib/emailHash.js";
import { isEmailHashVerified } from "../lib/emailVerificationStore.js";
import { isNullifierUsedLocally, markNullifierUsedLocally, normalizeNullifierHex } from "../lib/nullifierStore.js";
import { validateWebhookUrl } from "../lib/ssrf.js";
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

export function hydrateBatches(): void {
  for (const batch of listBatches()) {
    batches.set(batch.id, batch);
  }
}
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// POST /api/links/batch - Validate and enqueue a CSV batch. The body remains JSON so
// clients can send the exact CSV text without a multipart parsing dependency.
linkRoutes.post("/batch", async (req: Request, res: Response) => {
  const correlationId = String(req.header("x-correlation-id") || crypto.randomUUID());
  try {
    const creator = typeof req.body?.creator === "string" ? req.body.creator : "";
    const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
    const webhookUrl = typeof req.body?.webhookUrl === "string" ? req.body.webhookUrl : undefined;

    if (!creator || !csv) {
      res.status(400).json({ error: "Missing required fields: creator, csv", correlationId });
      return;
    }

    // Validate webhookUrl must be https:// and not point to an internal/private address
    if (webhookUrl !== undefined) {
      const error = await validateWebhookUrl(webhookUrl);
      if (error) {
        res.status(400).json({ error, correlationId });
        return;
      }
    }

    const rows = parseBatchCsv(csv);
    const batch = createBatchRecord(creator, correlationId, rows, webhookUrl);
    batches.set(batch.id, batch);
    saveBatch(batch);
    logger.info({ correlationId, batchId: batch.id, creator, rowCount: rows.length, totalAmount: batch.totalAmount, hasWebhook: !!webhookUrl }, "batch queued");
    const origin = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
    setImmediate(() => {
      processBatch(batch, async (row, secret) => {
        const hash = Buffer.from(sha256Hex(secret), "hex");
        logger.info({ correlationId, batchId: batch.id, row: row.row }, "processing batch row");
        return createBatchEscrowTransaction(creator, row, hash);
      }, origin).then(() => {
        saveBatch(batch);
        logger.info({ correlationId, batchId: batch.id, successCount: batch.successCount, failureCount: batch.failureCount }, "batch completed");
      }).catch((error) => {
        saveBatch(batch);
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

// GET /api/links/:hash - Get link details from the AtreusContract.
linkRoutes.get("/:hash", async (req: Request, res: Response) => {
  const correlationId = String(req.header("x-correlation-id") || crypto.randomUUID());
  const hash = String(req.params.hash);
  if (!HEX_64.test(hash)) {
    res.status(400).json({ error: "Invalid link hash format", correlationId });
    return;
  }
  try {
    const info = await getLinkInfo(hash);
    if (!info) {
      res.status(404).json({ error: "Link not found", correlationId });
      return;
    }
    res.json({
      hash,
      creator: info.creator,
      amount: info.amount.toString(),
      asset: info.asset,
      policyType: info.policyType,
      policyParams: info.policyParams,
      expiresAt: info.expiresAt.toString(),
      claimed: info.claimed,
      correlationId,
    });
  } catch (error: any) {
    logger.error({ correlationId, hash, error: error?.message }, "link lookup failed");
    res.status(500).json({ error: "Failed to read link from contract", correlationId });
  }
});

const HEX_64 = /^[0-9a-fA-F]{64}$/;
const FIELD_HEX = /^(0x)?[0-9a-fA-F]{64}$/;

// POST /api/links/prove - Generate a ZK UltraHonk proof for claim flow
linkRoutes.post("/prove", async (req: Request, res: Response) => {
  const correlationId = String(req.header("x-correlation-id") || crypto.randomUUID());
  try {
    const { secret, recipient } = req.body;
    if (!secret || !recipient) {
      res.status(400).json({ error: "Missing secret or recipient", correlationId });
      return;
    }
    const cleanSecret = secret.startsWith("0x") || secret.startsWith("0X") ? secret.slice(2) : secret;
    const secretBytes = Uint8Array.from(Buffer.from(cleanSecret, "hex"));
    const { Barretenberg, BarretenbergSync, UltraHonkBackend } = await import("@aztec/bb.js");
    const { Noir } = await import("@noir-lang/noir_js");
    const { addressToField } = await import("../lib/zk.js");

    const FR_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const secretField = BigInt("0x" + cleanSecret) % FR_ORDER;
    const recipientField = addressToField(recipient);

    const bbSync = await BarretenbergSync.new();
    const frBuffer = (val: bigint) => {
      const buf = new Uint8Array(32);
      let v = val;
      for (let i = 31; i >= 0; i--) {
        buf[i] = Number(v & 0xffn);
        v >>= 8n;
      }
      return buf;
    };

    const linkHashResult = (bbSync as any).pedersenHash({
      inputs: [frBuffer(secretField)],
      hashIndex: 0,
    });
    const linkHashField = BigInt("0x" + Buffer.from(linkHashResult.hash).toString("hex"));

    const nullifierResult = (bbSync as any).pedersenHash({
      inputs: [frBuffer(secretField), frBuffer(recipientField)],
      hashIndex: 0,
    });
    const nullifierField = BigInt("0x" + Buffer.from(nullifierResult.hash).toString("hex"));

    const circuit = await getCircuit();
    const noir = new Noir(circuit);
    const inputs = {
      secret: "0x" + secretField.toString(16).padStart(64, "0"),
      recipient: "0x" + recipientField.toString(16).padStart(64, "0"),
      link_hash: "0x" + linkHashField.toString(16).padStart(64, "0"),
      nullifier: "0x" + nullifierField.toString(16).padStart(64, "0"),
    };

    const { witness } = await noir.execute(inputs);
    const api = await Barretenberg.new({ threads: 1 });
    try {
      const backend = new UltraHonkBackend(circuit.bytecode, api);
      const result = await backend.generateProof(witness);
      const hashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
      const linkHashHex = Buffer.from(hashBuffer).toString("hex");

      res.json({
        proof: Buffer.from(result.proof).toString("hex"),
        linkHashHex,
        linkHashFieldHex: "0x" + linkHashField.toString(16).padStart(64, "0"),
        nullifierFieldHex: "0x" + nullifierField.toString(16).padStart(64, "0"),
      });
    } finally {
      await api.destroy();
    }
  } catch (err: any) {
    logger.error({ correlationId, error: err?.message }, "prove failed");
    res.status(500).json({ error: err?.message || "Failed to generate proof", correlationId });
  }
});

// POST /api/links/:hash/attest - ZK attestation-oracle endpoint.
// Verifies a real UltraHonk proof off-chain against the public inputs the client
// supplies (recipient, link_hash, nullifier) — never the private secret — and if
// valid, submits a signed on-chain attestation that claim_link requires before
// releasing funds. See contracts/README.md.
linkRoutes.post("/:hash/attest", async (req: Request, res: Response) => {
  const correlationId = String(req.header("x-correlation-id") || crypto.randomUUID());
  const hash = String(req.params.hash);
  const { recipient, proof, link_hash, nullifier, recipient_email_hash } = req.body;

  if (!recipient || !proof || !link_hash || !nullifier) {
    res.status(400).json({ error: "Missing recipient, proof, link_hash, or nullifier", correlationId });
    return;
  }

  if (!HEX_64.test(hash)) {
    res.status(400).json({ error: "Invalid link hash format", correlationId });
    return;
  }
  if (typeof link_hash !== "string" || !FIELD_HEX.test(link_hash)) {
    res.status(400).json({ error: "Invalid link_hash format", correlationId });
    return;
  }
  if (typeof nullifier !== "string" || !FIELD_HEX.test(nullifier)) {
    res.status(400).json({ error: "Invalid nullifier format", correlationId });
    return;
  }
  if (typeof proof !== "string" || !/^[0-9a-fA-F]+$/.test(proof)) {
    res.status(400).json({ error: "Invalid proof format", correlationId });
    return;
  }

  let emailHashBytes: Uint8Array | undefined;
  if (recipient_email_hash && typeof recipient_email_hash === "string" && recipient_email_hash.length === 64) {
    emailHashBytes = Uint8Array.from(Buffer.from(recipient_email_hash, "hex"));
  }

  // Email-restricted links must prove ownership via DKIM before attestation.
  if (recipient_email_hash !== undefined && recipient_email_hash !== null && recipient_email_hash !== "") {
    if (typeof recipient_email_hash !== "string" || !isEmailHashHex(recipient_email_hash.toLowerCase())) {
      res.status(400).json({
        error: "Invalid recipient_email_hash format (expected 64 hex chars)",
        correlationId,
      });
      return;
    }
    const emailHash = recipient_email_hash.toLowerCase();
    if (!isEmailHashVerified(emailHash)) {
      logger.warn({ correlationId, emailHash, hash }, "attest rejected: email not DKIM-verified");
      res.status(403).json({
        error:
          "Email ownership not verified. Complete POST /api/email/verify and /api/email/confirm with a DKIM-signed message before attesting an email-restricted link.",
        correlationId,
      });
      return;
    }
  }

  // Nullifier replay guard, two-tier: an in-memory cache is checked first (fast
  // path, no RPC call), and only on a cache miss do we fall back to querying the
  // VerifierContract on-chain — this is what keeps replay protection correct
  // across a backend restart, when the in-memory cache is empty. Both run before
  // the expensive ZK proof verification below.
  const nullifierHex = normalizeNullifierHex(nullifier);
  const nullifierBytes = Uint8Array.from(Buffer.from(nullifierHex, "hex"));
  if (isNullifierUsedLocally(nullifierHex)) {
    res.status(409).json({ error: "Nullifier already used", correlationId });
    return;
  }
  try {
    if (await checkNullifierOnChain(nullifierBytes)) {
      markNullifierUsedLocally(nullifierHex);
      res.status(409).json({ error: "Nullifier already used", correlationId });
      return;
    }
  } catch (err: any) {
    logger.error({ correlationId, error: err?.message }, "checkNullifierOnChain failed");
    res.status(503).json({ error: "Unable to verify nullifier status, try again", correlationId });
    return;
  }

  try {
    const proofBytes = Uint8Array.from(Buffer.from(proof, "hex"));

    const isValid = await verifyClaimProof((await getCircuit()).bytecode, proofBytes, recipient, link_hash, nullifier);
    if (!isValid) {
      res.status(400).json({ error: "ZK proof verification failed", correlationId });
      return;
    }

    const linkHashBytes = Uint8Array.from(Buffer.from(hash, "hex"));
    const txHash = await submitAttestation(linkHashBytes, recipient, emailHashBytes);

    markNullifierUsedLocally(nullifierHex);
    markNullifierOnChain(nullifierBytes).catch((err: any) => {
      logger.error({ correlationId, error: err?.message }, "markNullifierOnChain failed");
    });

    res.json({ success: true, hash, recipient, attestationTx: txHash, correlationId });
  } catch (err: any) {
    logger.error({ correlationId, error: err?.message }, "attestation failed");
    res.status(500).json({ error: err?.message || "Attestation failed", correlationId });
  }
});
