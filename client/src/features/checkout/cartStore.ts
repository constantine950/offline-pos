import { create } from "zustand";
import type { CartLine, Product } from "../../types";

interface CartState {
  lines: CartLine[];
  add: (p: Product) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalKobo: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  add: (p) =>
    set((s) => {
      const existing = s.lines.find((l) => l.productId === p.id);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.productId === p.id ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      return {
        lines: [
          ...s.lines,
          { productId: p.id, name: p.name, unitPriceKobo: p.priceKobo, qty: 1 },
        ],
      };
    }),
  setQty: (productId, qty) =>
    set((s) => ({
      lines:
        qty <= 0
          ? s.lines.filter((l) => l.productId !== productId)
          : s.lines.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    })),
  remove: (productId) =>
    set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),
  clear: () => set({ lines: [] }),
  totalKobo: () => get().lines.reduce((s, l) => s + l.unitPriceKobo * l.qty, 0),
}));
