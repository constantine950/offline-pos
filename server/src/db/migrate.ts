import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./client";

export async function migrate() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(dir, "schema.sql"), "utf8");
  await pool.query(sql);
}

// Run directly: pnpm db:migrate
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  migrate()
    .then(() => console.log("Migration done"))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
