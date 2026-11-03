import { type FormEvent, useState } from "react";
import { adjustStock } from "./inventoryService";

interface Props {
  productId: string;
  currentStock: number;
  onDone: () => void;
}

export function StockAdjustForm({ productId, currentStock, onDone }: Props) {
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) {
      setError("Enter a whole number above zero");
      return;
    }
    try {
      if (mode === "add") await adjustStock(productId, n, "restock");
      else await adjustStock(productId, -n, "adjustment");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <select
        className="rounded border p-1 text-sm"
        value={mode}
        onChange={(e) => setMode(e.target.value as "add" | "remove")}
      >
        <option value="add">Restock (+)</option>
        <option value="remove">Remove (damaged/lost) (-)</option>
      </select>
      <input
        className="w-20 rounded border p-1 text-sm"
        inputMode="numeric"
        placeholder="Qty"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
      />
      <button
        type="submit"
        className="rounded bg-black px-3 py-1 text-sm text-white"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-sm text-neutral-500"
      >
        Cancel
      </button>
      <span className="text-xs text-neutral-400">now: {currentStock}</span>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
