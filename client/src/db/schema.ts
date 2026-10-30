// Only indexed fields go here. Other fields are stored automatically.
export const STORES = {
  products: "id, name, sku, updatedAt",
  stockMovements: "id, productId, createdAt",
  sales: "id, createdAt",
  outbox: "++seq, id, entity, createdAt",
  meta: "key",
} as const;
