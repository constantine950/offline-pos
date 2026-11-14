import { db } from "./dexie";
import { getDeviceId, newId } from "../lib/id";
import { toKobo } from "../lib/money";
import { enqueue } from "../sync/outbox";
import type { Product, StockMovement } from "../types";

const DEMO = [
  { name: "Indomie (carton)", price: 7500, stock: 20 },
  { name: "Peak Milk Tin", price: 1200, stock: 40 },
  { name: "Bottled Water 75cl", price: 200, stock: 100 },
  { name: "Gala Sausage Roll", price: 300, stock: 60 },
  { name: "Coke 50cl", price: 300, stock: 48 },
];

export async function seedIfEmpty() {
  if ((await db.products.count()) > 0) return;
  const deviceId = await getDeviceId();
  const now = Date.now();

  await db.transaction(
    "rw",
    [db.products, db.stockMovements, db.outbox, db.meta],
    async () => {
      for (const d of DEMO) {
        const product: Product = {
          id: newId(),
          name: d.name,
          priceKobo: toKobo(d.price),
          active: true,
          updatedAt: now,
          deviceId,
        };
        await db.products.add(product);
        await enqueue("product", "create", product);

        const movement: StockMovement = {
          id: newId(),
          productId: product.id,
          delta: d.stock,
          reason: "restock",
          createdAt: now,
          deviceId,
        };
        await db.stockMovements.add(movement);
        await enqueue("stockMovement", "create", movement);
      }
    },
  );
}
