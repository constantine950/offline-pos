import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { syncRoutes } from "./routes/sync.routes";
import { errorHandler } from "./middleware/error";

export const app = express();

app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api", syncRoutes);

app.use(errorHandler);
