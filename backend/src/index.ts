import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import { linkRoutes } from "./routes/links.js";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.use("/api/links", linkRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info(`Atreus backend running on port ${PORT}`);
});

export default app;
