import { db } from "../db/dexie";
import { newId } from "../lib/id";
import type { OutboxItem } from "../types";

// Must be called inside a Dexie transaction that includes db.outbox.
export async function enqueue(
  entity: OutboxItem["entity"],
  op: OutboxItem["op"],
  payload: unknown,
) {
  await db.outbox.add({
    id: newId(),
    entity,
    op,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  });
}

const payloadId = (p: unknown) => (p as { id?: string })?.id;

// One-time: queue everything that existed before the sync engine did
// (the demo seed data). Skips anything already in the outbox.
export async function backfillOnce() {
  if (await db.meta.get("outboxBackfilled")) return;

  await db.transaction(
    "rw",
    [db.products, db.stockMovements, db.outbox, db.meta],
    async () => {
      const queued = new Set<string>();
      await db.outbox.each((i) => {
        const id = payloadId(i.payload);
        if (id) queued.add(id);
      });

      for (const p of await db.products.toArray()) {
        if (!queued.has(p.id)) await enqueue("product", "create", p);
      }
      for (const m of await db.stockMovements.toArray()) {
        if (!queued.has(m.id)) await enqueue("stockMovement", "create", m);
      }
      await db.meta.put({ key: "outboxBackfilled", value: true });
    },
  );
}

// Give up-to-5-times-failed items another go.
export async function resetFailed(maxAttempts: number) {
  await db.outbox
    .filter((i) => i.attempts >= maxAttempts)
    .modify({ attempts: 0, lastError: undefined });
}
