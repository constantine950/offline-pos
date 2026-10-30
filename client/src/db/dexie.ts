import Dexie, { type Table } from "dexie";
import { STORES } from "./schema";
import type {
  MetaRow,
  OutboxItem,
  Product,
  Sale,
  StockMovement,
} from "../types";

class PosDB extends Dexie {
  products!: Table<Product, string>;
  stockMovements!: Table<StockMovement, string>;
  sales!: Table<Sale, string>;
  outbox!: Table<OutboxItem, number>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("offline-pos");
    this.version(1).stores(STORES);
  }
}

export const db = new PosDB();
