CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY,
  name         text    NOT NULL,
  sku          text,
  price_kobo   integer NOT NULL CHECK (price_kobo >= 0),
  active       boolean NOT NULL DEFAULT true,
  updated_at   bigint  NOT NULL,
  device_id    uuid    NOT NULL
);

-- Server-side change counter for products, so devices can ask "what's new?"
CREATE SEQUENCE IF NOT EXISTS products_seq;
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS server_seq bigint NOT NULL DEFAULT nextval('products_seq');
CREATE INDEX IF NOT EXISTS idx_products_seq ON products(server_seq);

CREATE OR REPLACE FUNCTION bump_product_seq() RETURNS trigger AS $$
BEGIN
  NEW.server_seq := nextval('products_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_bump_seq ON products;
CREATE TRIGGER products_bump_seq
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION bump_product_seq();

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
CREATE INDEX IF NOT EXISTS idx_movements_seq ON stock_movements(received_seq);

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

-- Server-side change counter for sales, so devices can ask "what's new?"
CREATE SEQUENCE IF NOT EXISTS sales_seq;
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS server_seq bigint NOT NULL DEFAULT nextval('sales_seq');
CREATE INDEX IF NOT EXISTS idx_sales_seq ON sales(server_seq);