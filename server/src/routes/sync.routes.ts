import { Router } from "express";
import { z } from "zod";
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

const pullQuery = z.object({
  productsSince: z.coerce.number().int().min(0).default(0),
  movementsSince: z.coerce.number().int().min(0).default(0),
  salesSince: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

// Everything that changed since the cursors the device sends.
// (bigints are cast to double so they arrive as numbers, not strings)
syncRoutes.get("/pull", async (req, res, next) => {
  try {
    const q = pullQuery.parse(req.query);

    const products = await pool.query(
      `SELECT id, name, sku, price_kobo AS "priceKobo", active,
              updated_at::double precision AS "updatedAt",
              device_id AS "deviceId",
              server_seq::double precision AS "serverSeq"
         FROM products
        WHERE server_seq > $1
        ORDER BY server_seq
        LIMIT $2`,
      [q.productsSince, q.limit],
    );

    const movements = await pool.query(
      `SELECT id, product_id AS "productId", delta, reason, sale_id AS "saleId",
              created_at::double precision AS "createdAt",
              device_id AS "deviceId",
              received_seq::double precision AS "seq"
         FROM stock_movements
        WHERE received_seq > $1
        ORDER BY received_seq
        LIMIT $2`,
      [q.movementsSince, q.limit],
    );

    const sales = await pool.query(
      `SELECT id, receipt_no AS "receiptNo", items,
              total_kobo AS "totalKobo", payment_method AS "paymentMethod",
              created_at::double precision AS "createdAt",
              device_id AS "deviceId",
              server_seq::double precision AS "serverSeq"
         FROM sales
        WHERE server_seq > $1
        ORDER BY server_seq
        LIMIT $2`,
      [q.salesSince, q.limit],
    );

    res.json({
      products: products.rows,
      movements: movements.rows,
      sales: sales.rows,
    });
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
