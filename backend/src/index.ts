import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import { linkRoutes } from "./routes/links.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { relayRoutes } from "./routes/relay.js";

// Vercel serverless sets HOME to a non-existent path like /home/sbx_user1051.
// Barretenberg's WASM module writes .bb-crs to $HOME, so we redirect it to
// the only writable directory on Vercel.
process.env.HOME = "/tmp";

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
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://localhost:5173"];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.use("/api/links", linkRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/relay", relayRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Atreus backend running on port ${PORT}`);
  });
}
