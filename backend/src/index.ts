import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import { linkRoutes } from "./routes/links.js";
import { analyticsRoutes } from "./routes/analytics.js";

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
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/links", linkRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Atreus backend running on port ${PORT}`);
  });
}
