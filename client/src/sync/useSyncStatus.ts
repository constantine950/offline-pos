import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/dexie";
import { MAX_ATTEMPTS } from "./push";
import { useSyncState } from "./syncEngine";

export function useSyncStatus() {
  const counts = useLiveQuery(
    async () => {
      const all = await db.outbox.toArray();
      const failed = all.filter((i) => i.attempts >= MAX_ATTEMPTS).length;
      return { pending: all.length - failed, failed };
    },
    [],
    { pending: 0, failed: 0 },
  );
  const state = useSyncState();
  return { ...counts, ...state };
}
