import { type FormEvent, useState } from "react";
import { recountStock } from "./inventoryService";
import { useStockAlerts } from "./useStockAlerts";

function AlertRow({
  id,
  name,
  qty,
}: {
  id: string;
  name: string;
  qty: number;
}) {
  const [counted, setCounted] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (counted.trim() === "") {
      setError("Enter what you counted on the shelf");
      return;
    }
    try {
      await recountStock(id, Number(counted));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-baseline justify-between">
        <div className="font-medium">{name}</div>
        <div className="font-bold text-red-600">{qty} in system</div>
      </div>
      <form
        onSubmit={submit}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <input
          className="w-32 rounded border p-2 text-sm"
          inputMode="numeric"
          placeholder="Counted on shelf"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-black px-3 py-2 text-sm text-white"
        >
          Fix stock
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}

export function StockList() {
  const alerts = useStockAlerts();

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 text-sm text-neutral-500 shadow">
        Nothing to fix. Every product has zero or more in stock.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">
        These products sold more than the system had, usually because two tills
        sold the last items while offline. The sales are real, so nothing was
        lost. Count what's physically on the shelf and enter it below.
      </p>
      {alerts.map(({ product, qty }) => (
        <AlertRow
          key={product.id}
          id={product.id}
          name={product.name}
          qty={qty}
        />
      ))}
    </div>
  );
}
