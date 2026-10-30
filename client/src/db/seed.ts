import { db } from "./dexie";
import { getDeviceId, newId } from "../lib/id";
import { toKobo } from "../lib/money";

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

  await db.transaction("rw", db.products, db.stockMovements, async () => {
    for (const d of DEMO) {
      const id = newId();
      await db.products.add({
        id,
        name: d.name,
        priceKobo: toKobo(d.price),
        active: true,
        updatedAt: now,
        deviceId,
      });
      await db.stockMovements.add({
        id: newId(),
        productId: id,
        delta: d.stock,
        reason: "restock",
        createdAt: now,
        deviceId,
      });
    }
  });
}
