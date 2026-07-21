import { Router, Request, Response } from "express";
import pino from "pino";
import { hashEmail, isValidEmail } from "../lib/emailHash.js";
import {
  createChallenge,
  getPending,
  isEmailHashVerified,
  markVerified,
} from "../lib/emailVerificationStore.js";
import { verifyEmailOwnership } from "../lib/dkim.js";
import { emailEndpointLimiter } from "../lib/rateLimit.js";

export const emailRoutes: Router = Router();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const VERIFY_TO = process.env.EMAIL_VERIFY_TO || "verify@atreus.local";

function clientKey(req: Request): string {
  const xf = req.header("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function correlationId(req: Request): string {
  return String(req.header("x-correlation-id") || crypto.randomUUID());
}

/**
 * POST /api/email/verify
 * Start ownership verification for an email. Stores only sha256(email).
 * Returns a challenge the user must embed in a DKIM-signed message from that address.
 */
emailRoutes.post("/verify", (req: Request, res: Response) => {
  const cid = correlationId(req);
  const email = typeof req.body?.email === "string" ? req.body.email : "";

  const ipLimit = emailEndpointLimiter.check(`ip:${clientKey(req)}`);
  if (!ipLimit.allowed) {
    logger.warn({ correlationId: cid }, "email verify rate limited (ip)");
    res.status(429).json({
      error: "Too many verification requests. Please try again later.",
      retryAfterMs: ipLimit.retryAfterMs,
      correlationId: cid,
    });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Invalid email address", correlationId: cid });
    return;
  }

  const emailHash = hashEmail(email);
  const hashLimit = emailEndpointLimiter.check(`hash:${emailHash}`);
  if (!hashLimit.allowed) {
    logger.warn({ correlationId: cid, emailHash }, "email verify rate limited (hash)");
    res.status(429).json({
      error: "Too many verification requests for this email. Please try again later.",
      retryAfterMs: hashLimit.retryAfterMs,
      correlationId: cid,
    });
    return;
  }

  const { challenge, expiresAt } = createChallenge(email);
  logger.info({ correlationId: cid, emailHash }, "email verification challenge issued");

  res.status(200).json({
    emailHash,
    challenge,
    expiresAt: new Date(expiresAt).toISOString(),
    verifyTo: VERIFY_TO,
    instructions: [
      `Send an email FROM ${email.trim().toLowerCase()} TO ${VERIFY_TO}.`,
      `Put this challenge token in the subject or body: ${challenge}`,
      "Your provider must DKIM-sign the message (Gmail, Outlook, etc. do this by default).",
      "Then paste the full raw message source into POST /api/email/confirm.",
    ],
    correlationId: cid,
  });
});

/**
 * POST /api/email/confirm
 * Body: { email, rawMessage }
 * Verifies DKIM on the raw RFC822 message, From alignment, and challenge presence.
 */
emailRoutes.post("/confirm", async (req: Request, res: Response) => {
  const cid = correlationId(req);
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const rawMessage = typeof req.body?.rawMessage === "string" ? req.body.rawMessage : "";

  const ipLimit = emailEndpointLimiter.check(`ip-confirm:${clientKey(req)}`);
  if (!ipLimit.allowed) {
    res.status(429).json({
      error: "Too many confirmation attempts. Please try again later.",
      retryAfterMs: ipLimit.retryAfterMs,
      correlationId: cid,
    });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Invalid email address", correlationId: cid });
    return;
  }
  if (!rawMessage || rawMessage.length < 32 || rawMessage.length > 256_000) {
    res.status(400).json({
      error: "rawMessage must be a non-empty RFC822 message (max 256KB)",
      correlationId: cid,
    });
    return;
  }

  const emailHash = hashEmail(email);
  const pending = getPending(emailHash);
  if (!pending) {
    res.status(400).json({
      error: "No pending verification for this email. Call POST /api/email/verify first.",
      correlationId: cid,
    });
    return;
  }

  const result = await verifyEmailOwnership({
    claimedEmail: email,
    challenge: pending.challenge,
    rawMessage,
  });

  if (!result.ok) {
    logger.warn({ correlationId: cid, emailHash, error: result.error }, "email confirm failed");
    res.status(400).json({ error: result.error, correlationId: cid });
    return;
  }

  const record = markVerified(emailHash);
  logger.info({ correlationId: cid, emailHash }, "email ownership verified via DKIM");

  res.status(200).json({
    verified: true,
    emailHash,
    expiresAt: new Date(record.expiresAt).toISOString(),
    correlationId: cid,
  });
});

/**
 * GET /api/email/status?emailHash=...
 * Check whether a hash is currently verified (no raw email accepted).
 */
emailRoutes.get("/status", (req: Request, res: Response) => {
  const cid = correlationId(req);
  const emailHash = typeof req.query.emailHash === "string" ? req.query.emailHash.toLowerCase() : "";
  if (!/^[0-9a-f]{64}$/.test(emailHash)) {
    res.status(400).json({ error: "emailHash must be 64 lowercase hex chars", correlationId: cid });
    return;
  }
  res.json({ emailHash, verified: isEmailHashVerified(emailHash), correlationId: cid });
});
