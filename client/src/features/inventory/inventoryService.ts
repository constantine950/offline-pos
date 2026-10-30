import { db } from "../../db/dexie";

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
