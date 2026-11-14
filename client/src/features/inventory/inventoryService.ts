import { db } from "../../db/dexie";
import { getDeviceId, newId } from "../../lib/id";
import { enqueue } from "../../sync/outbox";
import type { StockMovement, StockReason } from "../../types";

export async function getStock(productId: string): Promise<number> {
  let total = 0;
  await db.stockMovements
    .where("productId")
    .equals(productId)
    .each((m) => {
      total += m.delta;
    });
  return total;
}

export async function getStockMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  await db.stockMovements.each((m) => {
    map.set(m.productId, (map.get(m.productId) ?? 0) + m.delta);
  });
  return map;
}

// delta > 0 adds stock, delta < 0 removes it (damaged, lost, miscount).
export async function adjustStock(
  productId: string,
  delta: number,
  reason: Exclude<StockReason, "sale">,
): Promise<StockMovement> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("Quantity must be a whole number, not zero");
  }

  return db.transaction(
    "rw",
    [db.products, db.stockMovements, db.outbox, db.meta],
    async () => {
      if (!(await db.products.get(productId)))
        throw new Error("Product not found");

      const current = await getStock(productId);
      if (current + delta < 0) {
        throw new Error(`Can't remove ${-delta}, only ${current} in stock`);
      }

      const movement: StockMovement = {
        id: newId(),
        productId,
        delta,
        reason,
        createdAt: Date.now(),
        deviceId: await getDeviceId(),
      };
      await db.stockMovements.add(movement);
      await enqueue("stockMovement", "create", movement);
      return movement;
    },
  );
}

// "I counted the shelf and there are N." Records the difference as an
// adjustment, so the ledger stays append-only and auditable.
export async function recountStock(
  productId: string,
  counted: number,
): Promise<StockMovement | null> {
  if (!Number.isInteger(counted) || counted < 0) {
    throw new Error("Count must be a whole number, zero or more");
  }

  return db.transaction(
    "rw",
    [db.products, db.stockMovements, db.outbox, db.meta],
    async () => {
      if (!(await db.products.get(productId)))
        throw new Error("Product not found");

      const current = await getStock(productId);
      const delta = counted - current;
      if (delta === 0) return null; // already matches

      const movement: StockMovement = {
        id: newId(),
        productId,
        delta,
        reason: "adjustment",
        createdAt: Date.now(),
        deviceId: await getDeviceId(),
      };
      await db.stockMovements.add(movement);
      await enqueue("stockMovement", "create", movement);
      return movement;
    },
  );
}
