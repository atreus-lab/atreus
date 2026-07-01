import { Router, Request, Response } from "express";

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

// POST /api/links/:hash/claim - Claim funds from a link
linkRoutes.post("/:hash/claim", async (req: Request, res: Response) => {
  const { hash } = req.params;
  const { recipient, proof } = req.body;

  if (!recipient || !proof) {
    res.status(400).json({ error: "Missing recipient or proof" });
    return;
  }

  // TODO: Verify proof via VerifierContract, claim via AtreusContract
  res.json({ success: true, hash, recipient });
});
