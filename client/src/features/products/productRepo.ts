import { db } from "../../db/dexie";
import { getDeviceId, newId } from "../../lib/id";
import { enqueue } from "../../sync/outbox";
import type { Product, StockMovement } from "../../types";

export interface NewProductInput {
  name: string;
  priceKobo: number;
  sku?: string;
  initialStock: number;
}

function validate(name: string, priceKobo: number) {
  if (!name.trim()) throw new Error("Name is required");
  if (!Number.isInteger(priceKobo) || priceKobo < 0) {
    throw new Error("Price must be zero or more");
  }
}

export async function createProduct(input: NewProductInput): Promise<Product> {
  validate(input.name, input.priceKobo);
  if (!Number.isInteger(input.initialStock) || input.initialStock < 0) {
    throw new Error("Stock must be a whole number, zero or more");
  }

  return db.transaction(
    "rw",
    [db.products, db.stockMovements, db.outbox, db.meta],
    async () => {
      const deviceId = await getDeviceId();
      const now = Date.now();

      const product: Product = {
        id: newId(),
        name: input.name.trim(),
        sku: input.sku?.trim() || undefined,
        priceKobo: input.priceKobo,
        active: true,
        updatedAt: now,
        deviceId,
      };
      await db.products.add(product);
      await enqueue("product", "create", product);

      if (input.initialStock > 0) {
        const movement: StockMovement = {
          id: newId(),
          productId: product.id,
          delta: input.initialStock,
          reason: "restock",
          createdAt: now,
          deviceId,
        };
        await db.stockMovements.add(movement);
        await enqueue("stockMovement", "create", movement);
      }

      return product;
    },
  );
}

export async function updateProduct(
  id: string,
  patch: Partial<Pick<Product, "name" | "priceKobo" | "sku" | "active">>,
): Promise<Product> {
  return db.transaction("rw", [db.products, db.outbox, db.meta], async () => {
    const existing = await db.products.get(id);
    if (!existing) throw new Error("Product not found");

    const next: Product = {
      ...existing,
      ...patch,
      sku:
        patch.sku !== undefined ? patch.sku.trim() || undefined : existing.sku,
      updatedAt: Date.now(),
      deviceId: await getDeviceId(),
    };
    validate(next.name, next.priceKobo);
    next.name = next.name.trim();

    await db.products.put(next);
    await enqueue("product", "update", next);
    return next;
  });
}
