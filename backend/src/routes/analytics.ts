import { Router, Request, Response } from "express";
import { ingestEvent, getSummaryStats, getGlobalTimeSeries, type EventType } from "../lib/analytics.js";

// Reporting is aggregate-only: no per-link stats and no link enumeration are
// exposed, so analytics cannot deanonymise a link or its recipient (issue #118).

export const analyticsRoutes: Router = Router();

const VALID_EVENTS: EventType[] = ["view", "initiation", "claim"];

analyticsRoutes.post("/event", (req: Request, res: Response) => {
  const correlationId = String(req.header("x-correlation-id") || crypto.randomUUID());
  try {
    const { linkHash, eventType, sessionId, timestamp } = req.body ?? {};
    if (!linkHash || typeof linkHash !== "string" || !/^[a-f0-9]{64}$/i.test(linkHash)) {
      res.status(400).json({ error: "Invalid linkHash: must be a 64-char hex string", correlationId });
      return;
    }
    if (!eventType || !VALID_EVENTS.includes(eventType)) {
      res.status(400).json({ error: `Invalid eventType: must be one of ${VALID_EVENTS.join(", ")}`, correlationId });
      return;
    }
    if (!sessionId || typeof sessionId !== "string" || sessionId.length < 8) {
      res.status(400).json({ error: "Invalid sessionId: must be a non-empty string with at least 8 characters", correlationId });
      return;
    }
    const event = ingestEvent({
      linkHash,
      eventType,
      sessionId,
      timestamp: typeof timestamp === "number" ? timestamp : undefined,
    });
    res.status(201).json({ id: event.id, status: "recorded", correlationId });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid event", correlationId });
  }
});

analyticsRoutes.get("/summary", (req: Request, res: Response) => {
  const correlationId = String(req.header("x-correlation-id") || crypto.randomUUID());
  try {
    const [stats, series7, series30, series90] = [
      getSummaryStats(),
      getGlobalTimeSeries(7),
      getGlobalTimeSeries(30),
      getGlobalTimeSeries(90),
    ];
    res.json({ stats, timeSeries: { "7d": series7, "30d": series30, "90d": series90 }, correlationId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to compute summary", correlationId });
  }
});
