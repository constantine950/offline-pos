import { Router } from "express";
import { pool } from "../db/client";
import { applyBatch, syncBatchSchema } from "../services/syncService";

export const syncRoutes = Router();

// Client sends its outbox, server replies with a result per item.
syncRoutes.post("/sync", async (req, res, next) => {
  try {
    const body = syncBatchSchema.parse(req.body);
    const results = await applyBatch(body.items);
    res.json({ results });
  } catch (e) {
    next(e);
  }
});

// What the owner sees: products that went below zero and still need a recount.
syncRoutes.get("/discrepancies", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.product_id, p.name, d.stock_after, d.detected_at
         FROM discrepancies d JOIN products p ON p.id = d.product_id
        WHERE d.resolved = false
        ORDER BY d.detected_at DESC`,
    );
    res.json({ discrepancies: rows });
  } catch (e) {
    next(e);
  }
});
