import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Atreus backend running on port ${PORT}`);
  });
}
