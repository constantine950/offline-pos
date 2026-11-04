import type { PoolClient } from "pg";

// After applying movements, check affected products. Negative = flag for the owner.
// Back to zero or above = auto-resolve the flag.
export async function flagNegativeStock(
  client: PoolClient,
  productIds: string[],
) {
  if (productIds.length === 0) return;

  const { rows } = await client.query(
    `SELECT product_id, COALESCE(SUM(delta), 0)::int AS stock
       FROM stock_movements
      WHERE product_id = ANY($1::uuid[])
      GROUP BY product_id`,
    [productIds],
  );

  for (const row of rows) {
    if (row.stock < 0) {
      const updated = await client.query(
        `UPDATE discrepancies SET stock_after = $2
          WHERE product_id = $1 AND resolved = false`,
        [row.product_id, row.stock],
      );
      if (updated.rowCount === 0) {
        await client.query(
          `INSERT INTO discrepancies (product_id, stock_after) VALUES ($1, $2)`,
          [row.product_id, row.stock],
        );
      }
    } else {
      await client.query(
        `UPDATE discrepancies SET resolved = true
          WHERE product_id = $1 AND resolved = false`,
        [row.product_id],
      );
    }
  }
}

export async function getStock(
  client: PoolClient,
  productId: string,
): Promise<number> {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(delta), 0)::int AS stock FROM stock_movements WHERE product_id = $1`,
    [productId],
  );
  return rows[0].stock;
}
