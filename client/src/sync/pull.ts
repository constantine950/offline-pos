import { db } from "../db/dexie";
import { getJson } from "../lib/api";
import type { Product, StockMovement } from "../types";

const LIMIT = 500;
const OVERLAP = 25; // re-read a few rows each time; applying twice is harmless
const MAX_PAGES = 50;

type PulledProduct = Omit<Product, "sku"> & {
  sku: string | null;
  serverSeq: number;
};
type PulledMovement = Omit<StockMovement, "saleId"> & {
  saleId: string | null;
  seq: number;
};

async function getCursor(key: string): Promise<number> {
  return ((await db.meta.get(key))?.value as number | undefined) ?? 0;
}

// NOTE: nothing here goes into the outbox. Pulled data came FROM the server,
// so pushing it back would loop forever.
export async function pullChanges(): Promise<number> {
  let changed = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const productsCursor = await getCursor("productsCursor");
    const movementsCursor = await getCursor("movementsCursor");

    const data = await getJson<{
      products: PulledProduct[];
      movements: PulledMovement[];
    }>(
      `/api/pull?productsSince=${Math.max(0, productsCursor - OVERLAP)}` +
        `&movementsSince=${Math.max(0, movementsCursor - OVERLAP)}&limit=${LIMIT}`,
    );

    await db.transaction(
      "rw",
      [db.products, db.stockMovements, db.meta],
      async () => {
        // Products: newer edit wins. A pending local edit that's newer stays put.
        for (const p of data.products) {
          const local = await db.products.get(p.id);
          if (!local || p.updatedAt > local.updatedAt) {
            await db.products.put({
              id: p.id,
              name: p.name,
              sku: p.sku ?? undefined,
              priceKobo: p.priceKobo,
              active: p.active,
              updatedAt: p.updatedAt,
              deviceId: p.deviceId,
            });
            changed++;
          }
        }

        // Movements: only add the ones we don't have yet.
        const existing = await db.stockMovements.bulkGet(
          data.movements.map((m) => m.id),
        );
        const fresh: StockMovement[] = [];
        data.movements.forEach((m, i) => {
          if (existing[i]) return;
          fresh.push({
            id: m.id,
            productId: m.productId,
            delta: m.delta,
            reason: m.reason,
            saleId: m.saleId ?? undefined,
            createdAt: m.createdAt,
            deviceId: m.deviceId,
          });
        });
        if (fresh.length) {
          await db.stockMovements.bulkAdd(fresh);
          changed += fresh.length;
        }

        // Cursors only ever move forward.
        const maxProduct = data.products.reduce(
          (mx, p) => Math.max(mx, p.serverSeq),
          0,
        );
        const maxMovement = data.movements.reduce(
          (mx, m) => Math.max(mx, m.seq),
          0,
        );
        await db.meta.put({
          key: "productsCursor",
          value: Math.max(productsCursor, maxProduct),
        });
        await db.meta.put({
          key: "movementsCursor",
          value: Math.max(movementsCursor, maxMovement),
        });
      },
    );

    if (data.products.length < LIMIT && data.movements.length < LIMIT) break;
  }

  return changed;
}
