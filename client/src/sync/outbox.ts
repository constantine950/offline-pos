import { db } from "../db/dexie";
import { newId } from "../lib/id";
import type { OutboxItem } from "../types";

// Must be called inside a Dexie transaction that includes db.outbox.
// Each entry gets its own unique key so the server can dedupe retries.
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
