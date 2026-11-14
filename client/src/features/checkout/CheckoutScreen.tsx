import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/dexie";
import { getStockMap } from "../inventory/inventoryService";
import { ReceiptView } from "../sales/ReceiptView";
import { completeSale } from "./saleService";
import { useCart } from "./cartStore";
import { formatNaira } from "../../lib/money";
import type { PaymentMethod, Sale } from "../../types";

export function CheckoutScreen() {
  const products = useLiveQuery(
    () => db.products.filter((p) => p.active).sortBy("name"),
    [],
  );
  const stock = useLiveQuery(() => getStockMap(), []);
  const cart = useCart();
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  async function checkout() {
    setError(null);
    try {
      const sale = await completeSale(cart.lines, payment);
      setReceipt(sale);
      cart.clear();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:grid-cols-3">
        {products?.map((p) => {
          const qty = stock?.get(p.id) ?? 0;
          return (
            <button
              key={p.id}
              disabled={qty <= 0}
              onClick={() => cart.add(p)}
              className="rounded-xl bg-white p-4 text-left shadow transition active:scale-95 disabled:opacity-40"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-lg font-bold">
                {formatNaira(p.priceKobo)}
              </div>
              <div className="text-xs text-neutral-500">{qty} in stock</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">Cart</h2>
        {cart.lines.length === 0 && (
          <p className="text-sm text-neutral-400">Tap a product to add it</p>
        )}
        {cart.lines.map((l) => (
          <div
            key={l.productId}
            className="mb-2 flex items-center justify-between"
          >
            <div>
              <div className="text-sm">{l.name}</div>
              <div className="text-xs text-neutral-500">
                {formatNaira(l.unitPriceKobo)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-7 w-7 rounded bg-neutral-200"
                onClick={() => cart.setQty(l.productId, l.qty - 1)}
              >
                -
              </button>
              <span>{l.qty}</span>
              <button
                className="h-7 w-7 rounded bg-neutral-200"
                onClick={() => cart.setQty(l.productId, l.qty + 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div className="mt-4 border-t pt-3">
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatNaira(cart.totalKobo())}</span>
          </div>
          <select
            className="mt-3 w-full rounded border p-2"
            value={payment}
            onChange={(e) => setPayment(e.target.value as PaymentMethod)}
          >
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="pos">POS</option>
          </select>
          <button
            onClick={checkout}
            disabled={cart.lines.length === 0}
            className="mt-3 w-full rounded-lg bg-black py-3 font-semibold text-white disabled:opacity-40"
          >
            Complete sale
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>

      {receipt && (
        <ReceiptView sale={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
}
