export type PaymentMethod = "cash" | "transfer" | "pos";
export type StockReason = "sale" | "restock" | "adjustment" | "return";

export interface Product {
  id: string;
  name: string;
  sku?: string;
  priceKobo: number;
  active: boolean;
  updatedAt: number;
  deviceId: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  delta: number; // + in, - out
  reason: StockReason;
  saleId?: string;
  createdAt: number;
  deviceId: string;
}

export interface SaleItem {
  productId: string;
  name: string; // snapshot, so old receipts don't change if product is renamed
  unitPriceKobo: number;
  qty: number;
}

export interface Sale {
  id: string;
  receiptNo: string;
  items: SaleItem[];
  totalKobo: number;
  paymentMethod: PaymentMethod;
  createdAt: number;
  deviceId: string;
}

export interface OutboxItem {
  seq?: number; // auto-increment, gives us ordering
  id: string; // idempotency key (server dedupes on this)
  entity: "sale" | "stockMovement" | "product";
  op: "create" | "update" | "delete";
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface CartLine {
  productId: string;
  name: string;
  unitPriceKobo: number;
  qty: number;
}
