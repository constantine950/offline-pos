import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/dexie";
import { getStockMap } from "./inventoryService";

export function useStockAlerts() {
  return useLiveQuery(
    async () => {
      const map = await getStockMap();
      const products = await db.products.toArray();
      return products
        .filter((p) => (map.get(p.id) ?? 0) < 0)
        .map((p) => ({ product: p, qty: map.get(p.id) ?? 0 }));
    },
    [],
    [],
  );
}
