import { type FormEvent, useState } from "react";
import { createProduct, updateProduct } from "./productRepo";
import { toKobo } from "../../lib/money";
import type { Product } from "../../types";

interface Props {
  product?: Product; // present = edit mode
  onDone: () => void;
}

export function ProductForm({ product, onDone }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(
    product ? String(product.priceKobo / 100) : "",
  );
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const naira = Number(price);
    if (!price.trim() || Number.isNaN(naira) || naira < 0) {
      setError("Enter a valid price");
      return;
    }

    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, {
          name,
          priceKobo: toKobo(naira),
          sku,
        });
      } else {
        await createProduct({
          name,
          priceKobo: toKobo(naira),
          sku,
          initialStock: Number(stock) || 0,
        });
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded border p-2";

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl bg-white p-4 shadow"
    >
      <h3 className="font-semibold">
        {product ? "Edit product" : "New product"}
      </h3>

      <label className="block text-sm">
        Name
        <input
          className={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        Price (₦)
        <input
          className={input}
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        SKU / barcode (optional)
        <input
          className={input}
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
      </label>

      {!product && (
        <label className="block text-sm">
          Starting stock
          <input
            className={input}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg bg-neutral-200 px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
