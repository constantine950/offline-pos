import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/dexie";
import { seedIfEmpty } from "../src/db/seed";
import { completeSale } from "../src/features/checkout/saleService";
import { getStock } from "../src/features/inventory/inventoryService";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await seedIfEmpty();
});

describe("completeSale", () => {
  it("reduces stock and queues outbox entries", async () => {
    const p = (await db.products.toArray())[0];
    const before = await getStock(p.id);

    await completeSale(
      [{ productId: p.id, name: p.name, unitPriceKobo: p.priceKobo, qty: 2 }],
      "cash",
    );

    expect(await getStock(p.id)).toBe(before - 2);
    expect(await db.outbox.count()).toBe(2); // 1 sale + 1 stock movement
  });

  it("rejects selling more than we have, and writes nothing", async () => {
    const p = (await db.products.toArray())[0];
    const before = await getStock(p.id);

    await expect(
      completeSale(
        [
          {
            productId: p.id,
            name: p.name,
            unitPriceKobo: p.priceKobo,
            qty: before + 1,
          },
        ],
        "cash",
      ),
    ).rejects.toThrow(/Not enough stock/);

    expect(await db.sales.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
  });
});
