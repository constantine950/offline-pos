import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/dexie";
import { createProduct } from "../src/features/products/productRepo";
import {
  adjustStock,
  getStock,
} from "../src/features/inventory/inventoryService";

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("products and stock", () => {
  it("creates a product with starting stock and queues both", async () => {
    const p = await createProduct({
      name: "Sugar",
      priceKobo: 150000,
      initialStock: 10,
    });
    expect(await getStock(p.id)).toBe(10);
    expect(await db.outbox.count()).toBe(2); // product + stock movement
  });

  it("restocks and removes stock", async () => {
    const p = await createProduct({
      name: "Rice",
      priceKobo: 500000,
      initialStock: 5,
    });
    await adjustStock(p.id, 3, "restock");
    await adjustStock(p.id, -2, "adjustment");
    expect(await getStock(p.id)).toBe(6);
  });

  it("won't let stock go negative", async () => {
    const p = await createProduct({
      name: "Salt",
      priceKobo: 50000,
      initialStock: 2,
    });
    await expect(adjustStock(p.id, -3, "adjustment")).rejects.toThrow(/only 2/);
    expect(await getStock(p.id)).toBe(2);
  });

  it("rejects a blank name", async () => {
    await expect(
      createProduct({ name: "  ", priceKobo: 100, initialStock: 0 }),
    ).rejects.toThrow(/Name is required/);
  });
});
