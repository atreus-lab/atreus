import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import { Keypair } from "@stellar/stellar-sdk";
import { linkRoutes, hydrateBatches } from "./routes/links.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { relayRoutes } from "./routes/relay.js";
import { emailRoutes } from "./routes/email.js";
import { monitoringRouter } from "./routes/monitoring.js";

const logger = pino(
  process.env.VERCEL
    ? { level: "info" }
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
);

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

hydrateBatches();

app.use("/api/links", linkRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/relay", relayRoutes);
app.use("/api/email", emailRoutes);
app.use("/monitoring", monitoringRouter);

app.get("/api/health", (_req, res) => {
  const issues: string[] = [];

  // Validate ATTESTER_SECRET_KEY
  let attesterPubKey: string | null = null;
  try {
    const secret = process.env.ATTESTER_SECRET_KEY;
    if (!secret) {
      issues.push("ATTESTER_SECRET_KEY is not set");
    } else {
      attesterPubKey = Keypair.fromSecret(secret).publicKey();
    }
  } catch (e: any) {
    issues.push(`ATTESTER_SECRET_KEY is invalid: ${e.message}`);
  }

  // Validate RELAYER_SECRET_KEY
  let relayerPubKey: string | null = null;
  try {
    const secret = process.env.RELAYER_SECRET_KEY;
    if (!secret) {
      issues.push("RELAYER_SECRET_KEY is not set");
    } else {
      relayerPubKey = Keypair.fromSecret(secret).publicKey();
    }
  } catch (e: any) {
    issues.push(`RELAYER_SECRET_KEY is invalid: ${e.message}`);
  }

  // Check required contract IDs
  if (!process.env.NEXT_PUBLIC_CONTRACT_ID) issues.push("NEXT_PUBLIC_CONTRACT_ID is not set");
  if (!process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID) issues.push("NEXT_PUBLIC_VERIFIER_CONTRACT_ID is not set");
  if (!process.env.NEXT_PUBLIC_TOKEN_ID) issues.push("NEXT_PUBLIC_TOKEN_ID is not set");

  res.json({
    status: issues.length === 0 ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    config: {
      attesterPublicKey: attesterPubKey,
      relayerPublicKey: relayerPubKey,
      contractId: process.env.NEXT_PUBLIC_CONTRACT_ID || null,
      verifierContractId: process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID || null,
      tokenId: process.env.NEXT_PUBLIC_TOKEN_ID || null,
    },
    issues,
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;

if (!process.env.VERCEL) {
  // ── Startup validation ──
  try {
    const attSecret = process.env.ATTESTER_SECRET_KEY;
    const relSecret = process.env.RELAYER_SECRET_KEY;
    if (attSecret) {
      const kp = Keypair.fromSecret(attSecret);
      logger.info({ publicKey: kp.publicKey() }, "ATTESTER_SECRET_KEY validated");
    } else {
      logger.warn("ATTESTER_SECRET_KEY is not set — attestations will fail");
    }
    if (relSecret) {
      const kp = Keypair.fromSecret(relSecret);
      logger.info({ publicKey: kp.publicKey() }, "RELAYER_SECRET_KEY validated");
    } else {
      logger.warn("RELAYER_SECRET_KEY is not set — relay will fail");
    }
  } catch (e: any) {
    logger.error({ error: e.message }, "Key validation failed at startup");
  }
  app.listen(PORT, () => {
    logger.info(`Atreus backend running on port ${PORT}`);
  });
}
