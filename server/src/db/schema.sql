CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY,
  name         text    NOT NULL,
  sku          text,
  price_kobo   integer NOT NULL CHECK (price_kobo >= 0),
  active       boolean NOT NULL DEFAULT true,
  updated_at   bigint  NOT NULL,
  device_id    uuid    NOT NULL
);

-- Append-only ledger. Stock = SUM(delta). received_seq is the server's own ordering.
CREATE TABLE IF NOT EXISTS stock_movements (
  id            uuid PRIMARY KEY,
  product_id    uuid    NOT NULL REFERENCES products(id),
  delta         integer NOT NULL CHECK (delta <> 0),
  reason        text    NOT NULL,
  sale_id       uuid,
  created_at    bigint  NOT NULL,
  device_id     uuid    NOT NULL,
  received_seq  bigserial
);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);

CREATE TABLE IF NOT EXISTS sales (
  id              uuid PRIMARY KEY,
  receipt_no      text    NOT NULL,
  items           jsonb   NOT NULL,
  total_kobo      integer NOT NULL,
  payment_method  text    NOT NULL,
  created_at      bigint  NOT NULL,
  device_id       uuid    NOT NULL
);

-- "Indomie is at -2, go count the shelf"
CREATE TABLE IF NOT EXISTS discrepancies (
  id           bigserial PRIMARY KEY,
  product_id   uuid    NOT NULL REFERENCES products(id),
  stock_after  integer NOT NULL,
  detected_at  timestamptz NOT NULL DEFAULT now(),
  resolved     boolean NOT NULL DEFAULT false
);