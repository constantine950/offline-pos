import type { PaymentMethod, Sale } from "../../types";

export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface Summary {
  count: number;
  totalKobo: number;
  byMethod: Record<PaymentMethod, number>;
}

export function summarize(sales: Sale[]): Summary {
  const byMethod: Record<PaymentMethod, number> = {
    cash: 0,
    transfer: 0,
    pos: 0,
  };
  let totalKobo = 0;
  for (const s of sales) {
    totalKobo += s.totalKobo;
    byMethod[s.paymentMethod] += s.totalKobo;
  }
  return { count: sales.length, totalKobo, byMethod };
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer",
  pos: "POS",
};
