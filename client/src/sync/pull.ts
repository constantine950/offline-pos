import { db } from "../db/dexie";
import { getJson } from "../lib/api";
import type { Product, Sale, StockMovement } from "../types";

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
type PulledSale = Sale & { serverSeq: number };

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
    const salesCursor = await getCursor("salesCursor");

    const data = await getJson<{
      products: PulledProduct[];
      movements: PulledMovement[];
      sales: PulledSale[];
    }>(
      `/api/pull?productsSince=${Math.max(0, productsCursor - OVERLAP)}` +
        `&movementsSince=${Math.max(0, movementsCursor - OVERLAP)}` +
        `&salesSince=${Math.max(0, salesCursor - OVERLAP)}&limit=${LIMIT}`,
    );

    await db.transaction(
      "rw",
      [db.products, db.stockMovements, db.sales, db.meta],
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
        const existingMovements = await db.stockMovements.bulkGet(
          data.movements.map((m) => m.id),
        );
        const freshMovements: StockMovement[] = [];
        data.movements.forEach((m, i) => {
          if (existingMovements[i]) return;
          freshMovements.push({
            id: m.id,
            productId: m.productId,
            delta: m.delta,
            reason: m.reason,
            saleId: m.saleId ?? undefined,
            createdAt: m.createdAt,
            deviceId: m.deviceId,
          });
        });
        if (freshMovements.length) {
          await db.stockMovements.bulkAdd(freshMovements);
          changed += freshMovements.length;
        }

        // Sales never change once made, so just add the ones we don't have.
        const existingSales = await db.sales.bulkGet(
          data.sales.map((s) => s.id),
        );
        const freshSales: Sale[] = [];
        data.sales.forEach((s, i) => {
          if (existingSales[i]) return;
          freshSales.push({
            id: s.id,
            receiptNo: s.receiptNo,
            items: s.items,
            totalKobo: s.totalKobo,
            paymentMethod: s.paymentMethod,
            createdAt: s.createdAt,
            deviceId: s.deviceId,
          });
        });
        if (freshSales.length) {
          await db.sales.bulkAdd(freshSales);
          changed += freshSales.length;
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
        const maxSale = data.sales.reduce(
          (mx, s) => Math.max(mx, s.serverSeq),
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
        await db.meta.put({
          key: "salesCursor",
          value: Math.max(salesCursor, maxSale),
        });
      },
    );

    if (
      data.products.length < LIMIT &&
      data.movements.length < LIMIT &&
      data.sales.length < LIMIT
    ) {
      break;
    }
  }

  return changed;
}
