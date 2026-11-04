import type { PoolClient } from "pg";
import { z } from "zod";
import { pool } from "../db/client";
import { flagNegativeStock } from "./stockService";

const uuid = z.string().uuid();
const timestamp = z.number().int().nonnegative();

export const productPayload = z.object({
  id: uuid,
  name: z.string().min(1),
  sku: z.string().optional(),
  priceKobo: z.number().int().nonnegative(),
  active: z.boolean(),
  updatedAt: timestamp,
  deviceId: uuid,
});

export const movementPayload = z.object({
  id: uuid,
  productId: uuid,
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "delta can't be 0"),
  reason: z.enum(["sale", "restock", "adjustment", "return"]),
  saleId: uuid.optional(),
  createdAt: timestamp,
  deviceId: uuid,
});

export const salePayload = z.object({
  id: uuid,
  receiptNo: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: uuid,
        name: z.string(),
        unitPriceKobo: z.number().int().nonnegative(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
  totalKobo: z.number().int().nonnegative(),
  paymentMethod: z.enum(["cash", "transfer", "pos"]),
  createdAt: timestamp,
  deviceId: uuid,
});

export const outboxItemSchema = z.object({
  id: uuid,
  entity: z.enum(["product", "stockMovement", "sale"]),
  op: z.enum(["create", "update", "delete"]),
  payload: z.unknown(),
});

export const syncBatchSchema = z.object({
  deviceId: uuid,
  items: z.array(outboxItemSchema).max(200),
});

export type OutboxItemIn = z.infer<typeof outboxItemSchema>;
export type ItemResult = {
  id: string;
  status: "applied" | "skipped" | "rejected";
  error?: string;
};

type Applied = { status: "applied" | "skipped"; productId?: string };

async function applyItem(
  client: PoolClient,
  item: OutboxItemIn,
): Promise<Applied> {
  if (item.op === "delete")
    throw new Error("delete is not supported (hide the product instead)");

  switch (item.entity) {
    case "product": {
      const p = productPayload.parse(item.payload);
      // Last write wins, but only if the incoming edit is newer.
      const r = await client.query(
        `INSERT INTO products (id, name, sku, price_kobo, active, updated_at, device_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, sku = EXCLUDED.sku, price_kobo = EXCLUDED.price_kobo,
           active = EXCLUDED.active, updated_at = EXCLUDED.updated_at,
           device_id = EXCLUDED.device_id
         WHERE products.updated_at < EXCLUDED.updated_at`,
        [
          p.id,
          p.name,
          p.sku ?? null,
          p.priceKobo,
          p.active,
          p.updatedAt,
          p.deviceId,
        ],
      );
      return { status: r.rowCount ? "applied" : "skipped" };
    }

    case "stockMovement": {
      const m = movementPayload.parse(item.payload);
      const r = await client.query(
        `INSERT INTO stock_movements (id, product_id, delta, reason, sale_id, created_at, device_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          m.id,
          m.productId,
          m.delta,
          m.reason,
          m.saleId ?? null,
          m.createdAt,
          m.deviceId,
        ],
      );
      return r.rowCount
        ? { status: "applied", productId: m.productId }
        : { status: "skipped" };
    }

    case "sale": {
      const s = salePayload.parse(item.payload);
      const r = await client.query(
        `INSERT INTO sales (id, receipt_no, items, total_kobo, payment_method, created_at, device_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.receiptNo,
          JSON.stringify(s.items),
          s.totalKobo,
          s.paymentMethod,
          s.createdAt,
          s.deviceId,
        ],
      );
      return { status: r.rowCount ? "applied" : "skipped" };
    }
  }
}

export async function applyBatch(items: OutboxItemIn[]): Promise<ItemResult[]> {
  const client = await pool.connect();
  const results: ItemResult[] = [];
  const touchedProducts = new Set<string>();

  try {
    await client.query("BEGIN");

    for (const item of items) {
      await client.query("SAVEPOINT item");
      try {
        const out = await applyItem(client, item);
        await client.query("RELEASE SAVEPOINT item");
        results.push({ id: item.id, status: out.status });
        if (out.productId) touchedProducts.add(out.productId);
      } catch (e) {
        // One bad item must not block the rest of the batch.
        await client.query("ROLLBACK TO SAVEPOINT item");
        results.push({
          id: item.id,
          status: "rejected",
          error: (e as Error).message,
        });
      }
    }

    await flagNegativeStock(client, [...touchedProducts]);
    await client.query("COMMIT");
    return results;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
