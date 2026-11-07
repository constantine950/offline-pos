import { db } from "../db/dexie";
import { ApiError, postJson } from "../lib/api";
import { getDeviceId } from "../lib/id";

export const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;

// Products must reach the server before the stock movements that point at them.
const RANK = { product: 0, stockMovement: 1, sale: 2 } as const;

interface ItemResult {
  id: string;
  status: "applied" | "skipped" | "rejected";
  error?: string;
}

export async function pushOutbox(): Promise<number> {
  const pending = (await db.outbox.toArray())
    .filter((i) => i.attempts < MAX_ATTEMPTS)
    .sort((a, b) => RANK[a.entity] - RANK[b.entity] || a.seq! - b.seq!);

  if (pending.length === 0) return 0;

  const deviceId = await getDeviceId();
  let sent = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);

    let results: ItemResult[];
    try {
      const res = await postJson<{ results: ItemResult[] }>("/api/sync", {
        deviceId,
        items: batch.map(({ id, entity, op, payload }) => ({
          id,
          entity,
          op,
          payload,
        })),
      });
      results = res.results;
    } catch (e) {
      // A 4xx means the batch itself is malformed: count it so we don't retry forever.
      // Network errors and 5xx are not the items' fault, so leave them untouched.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        await db.transaction("rw", db.outbox, async () => {
          for (const item of batch) {
            await db.outbox.update(item.seq!, {
              attempts: item.attempts + 1,
              lastError: e.message,
            });
          }
        });
      }
      throw e;
    }

    const byId = new Map(results.map((r) => [r.id, r]));
    await db.transaction("rw", db.outbox, async () => {
      for (const item of batch) {
        const r = byId.get(item.id);
        if (!r) continue;
        if (r.status === "rejected") {
          await db.outbox.update(item.seq!, {
            attempts: item.attempts + 1,
            lastError: r.error,
          });
        } else {
          // applied or skipped (server already had it): either way it's done
          await db.outbox.delete(item.seq!);
          sent++;
        }
      }
    });
  }

  return sent;
}
