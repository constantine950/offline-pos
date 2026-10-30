import { db } from "../../db/dexie";
import { getDeviceId, newId, nextReceiptNo } from "../../lib/id";
import { getStock } from "../inventory/inventoryService";
import type { CartLine, PaymentMethod, Sale, StockMovement } from "../../types";

export async function completeSale(
  lines: CartLine[],
  paymentMethod: PaymentMethod,
): Promise<Sale> {
  if (lines.length === 0) throw new Error("Cart is empty");

  return db.transaction(
    "rw",
    [db.sales, db.stockMovements, db.outbox, db.meta],
    async () => {
      // 1. Local stock check
      for (const line of lines) {
        const stock = await getStock(line.productId);
        if (stock < line.qty) {
          throw new Error(`Not enough stock for ${line.name} (have ${stock})`);
        }
      }

      const deviceId = await getDeviceId();
      const now = Date.now();
      const saleId = newId();

      const sale: Sale = {
        id: saleId,
        receiptNo: await nextReceiptNo(),
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          unitPriceKobo: l.unitPriceKobo,
          qty: l.qty,
        })),
        totalKobo: lines.reduce((s, l) => s + l.unitPriceKobo * l.qty, 0),
        paymentMethod,
        createdAt: now,
        deviceId,
      };

      // 2. Write sale + outbox entry
      await db.sales.add(sale);
      await db.outbox.add({
        id: sale.id,
        entity: "sale",
        op: "create",
        payload: sale,
        createdAt: now,
        attempts: 0,
      });

      // 3. Stock movements (one per line) + outbox entries
      for (const line of lines) {
        const movement: StockMovement = {
          id: newId(),
          productId: line.productId,
          delta: -line.qty,
          reason: "sale",
          saleId,
          createdAt: now,
          deviceId,
        };
        await db.stockMovements.add(movement);
        await db.outbox.add({
          id: movement.id,
          entity: "stockMovement",
          op: "create",
          payload: movement,
          createdAt: now,
          attempts: 0,
        });
      }

      return sale;
    },
  );
}
