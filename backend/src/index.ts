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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/links", linkRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info(`PayLink backend running on port ${PORT}`);
});

export default app;
