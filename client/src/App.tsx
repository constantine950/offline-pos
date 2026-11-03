import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/dexie";
import { CheckoutScreen } from "./features/checkout/CheckoutScreen";
import { ProductList } from "./features/products/ProductList";

type Tab = "checkout" | "products";

export default function App() {
  const [tab, setTab] = useState<Tab>("checkout");
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);

  const tabClass = (t: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      tab === t ? "bg-black text-white" : "bg-white"
    }`;

  return (
    <div className="min-h-screen bg-neutral-100 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Offline POS</h1>
        <span className="rounded-full bg-amber-200 px-3 py-1 text-sm">
          {pending} unsynced
        </span>
      </header>

      <nav className="mb-4 flex gap-2">
        <button
          className={tabClass("checkout")}
          onClick={() => setTab("checkout")}
        >
          Checkout
        </button>
        <button
          className={tabClass("products")}
          onClick={() => setTab("products")}
        >
          Products
        </button>
      </nav>

      {tab === "checkout" ? <CheckoutScreen /> : <ProductList />}
    </div>
  );
}
