import { useState } from "react";
import { CheckoutScreen } from "./features/checkout/CheckoutScreen";
import { ProductList } from "./features/products/ProductList";
import { StockList } from "./features/inventory/StockList";
import { useStockAlerts } from "./features/inventory/useStockAlerts";
import { SalesHistory } from "./features/sales/SalesHistory";
import { SyncBadge } from "./components/SyncBadge";
import { OfflineBanner } from "./components/OfflineBanner";

type Tab = "checkout" | "sales" | "products" | "alerts";

export default function App() {
  const [tab, setTab] = useState<Tab>("checkout");
  const alerts = useStockAlerts();

  const tabClass = (t: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      tab === t ? "bg-black text-white" : "bg-white"
    }`;

  return (
    <div className="min-h-screen bg-neutral-100 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Offline POS</h1>
        <SyncBadge />
      </header>

      <OfflineBanner />

      <nav className="mb-4 flex flex-wrap gap-2">
        <button
          className={tabClass("checkout")}
          onClick={() => setTab("checkout")}
        >
          Checkout
        </button>
        <button className={tabClass("sales")} onClick={() => setTab("sales")}>
          Sales
        </button>
        <button
          className={tabClass("products")}
          onClick={() => setTab("products")}
        >
          Products
        </button>
        <button className={tabClass("alerts")} onClick={() => setTab("alerts")}>
          Stock alerts
          {alerts.length > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {alerts.length}
            </span>
          )}
        </button>
      </nav>

      {tab === "checkout" && <CheckoutScreen />}
      {tab === "sales" && <SalesHistory />}
      {tab === "products" && <ProductList />}
      {tab === "alerts" && <StockList />}
    </div>
  );
}
