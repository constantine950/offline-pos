import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/dexie";
import { seedIfEmpty } from "../../db/seed";
import { getStockMap } from "../inventory/inventoryService";
import { StockAdjustForm } from "../inventory/StockAdjustForm";
import { ProductForm } from "./ProductForm";
import { updateProduct } from "./productRepo";
import { formatNaira } from "../../lib/money";

export function ProductList() {
  const products = useLiveQuery(
    () => db.products.orderBy("name").toArray(),
    [],
  );
  const stock = useLiveQuery(() => getStockMap(), []);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {adding ? (
        <ProductForm onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          + Add product
        </button>
      )}

      {products?.length === 0 && !adding && (
        <div className="rounded-xl bg-white p-4 text-sm shadow">
          <p className="mb-2 text-neutral-500">
            No products yet. If another device already has products, they'll
            appear here once it syncs. Otherwise:
          </p>
          <button onClick={() => seedIfEmpty()} className="underline">
            Load demo products
          </button>
        </div>
      )}

      {products?.map((p) => {
        const qty = stock?.get(p.id) ?? 0;

        if (editingId === p.id) {
          return (
            <ProductForm
              key={p.id}
              product={p}
              onDone={() => setEditingId(null)}
            />
          );
        }

        return (
          <div
            key={p.id}
            className={`rounded-xl bg-white p-4 shadow ${p.active ? "" : "opacity-50"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">
                  {p.name}{" "}
                  {!p.active && <span className="text-xs">(hidden)</span>}
                </div>
                <div className="text-sm text-neutral-500">
                  {formatNaira(p.priceKobo)} · {qty} in stock
                  {p.sku ? ` · ${p.sku}` : ""}
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => setAdjustingId(p.id)}
                  className="underline"
                >
                  Stock
                </button>
                <button
                  onClick={() => setEditingId(p.id)}
                  className="underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => updateProduct(p.id, { active: !p.active })}
                  className="underline"
                >
                  {p.active ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {adjustingId === p.id && (
              <StockAdjustForm
                productId={p.id}
                currentStock={qty}
                onDone={() => setAdjustingId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
