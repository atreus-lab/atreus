import { Request, Response, Router } from "express";
import {
  FeeBumpTransaction,
  Keypair,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { networkPassphrase, rpcServer } from "../lib/stellar.js";

export const relayRoutes: Router = Router();

const MAX_XDR_LENGTH = 100_000;

function relayerKeypair(): Keypair {
  const secret = process.env.RELAYER_SECRET_KEY;
  if (!secret) {
    throw new Error("RELAYER_SECRET_KEY is not configured");
  }
  return Keypair.fromSecret(secret);
}

function feeBumpFee(): string {
  const configuredFee = process.env.RELAYER_FEE_BUMP_FEE || "100000";
  const fee = Number(configuredFee);
  if (!Number.isSafeInteger(fee) || fee <= 0) {
    throw new Error("RELAYER_FEE_BUMP_FEE must be a positive integer");
  }
  return configuredFee;
}

// POST /api/relay
//
// The frontend must send a fully assembled, user-signed inner transaction. The
// relayer never mutates that transaction: doing so would invalidate the user's
// signature and could change the fee-bound contract invocation they approved.
relayRoutes.post("/", async (req: Request, res: Response) => {
  const transactionXdr = req.body?.transactionXdr;
  if (typeof transactionXdr !== "string" || !transactionXdr.length) {
    res.status(400).json({ error: "transactionXdr is required" });
    return;
  }
  if (transactionXdr.length > MAX_XDR_LENGTH) {
    res.status(413).json({ error: "transactionXdr is too large" });
    return;
  }

  let innerTransaction: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    // A client must not provide an already fee-bumped envelope: this endpoint
    // owns the outer envelope and signs it with the configured relayer account.
    if (!(parsed instanceof Transaction) || parsed instanceof FeeBumpTransaction) {
      res.status(400).json({ error: "transactionXdr must be an inner transaction" });
      return;
    }
    if (parsed.signatures.length === 0) {
      res.status(400).json({ error: "transactionXdr must include a user signature" });
      return;
    }
    innerTransaction = parsed;
  } catch {
    res.status(400).json({ error: "Invalid transaction XDR or network" });
    return;
  }

  try {
    // Simulate the exact signed inner envelope before putting relayer funds at
    // risk. A failed simulation is never submitted or fee-bumped.
    const simulation: any = await rpcServer.simulateTransaction(innerTransaction);
    if (simulation.error || simulation.restorePreamble) {
      res.status(400).json({
        error: simulation.restorePreamble
          ? "Transaction requires a footprint restore before it can be relayed"
          : "Transaction simulation failed",
        simulationError: simulation.error || undefined,
      });
      return;
    }

    const relayer = relayerKeypair();
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      relayer,
      feeBumpFee(),
      innerTransaction,
      networkPassphrase,
    );
    feeBump.sign(relayer);

    const submitted: any = await rpcServer.sendTransaction(feeBump);
    if (submitted.status === "ERROR") {
      res.status(400).json({
        error: "Transaction submission failed",
        resultXdr: submitted.errorResultXdr || submitted.errorResult,
      });
      return;
    }

    res.status(202).json({ hash: submitted.hash, status: submitted.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Relayer failed";
    // Configuration problems are actionable by the operator; malformed or
    // otherwise invalid client transactions remain client errors.
    const status = message.startsWith("RELAYER_") ? 503 : 400;
    res.status(status).json({ error: message });
  }
});
