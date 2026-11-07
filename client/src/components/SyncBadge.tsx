import { useSyncStatus } from "../sync/useSyncStatus";
import { resetFailed } from "../sync/outbox";
import { MAX_ATTEMPTS } from "../sync/push";
import { syncNow } from "../sync/syncEngine";

export function SyncBadge() {
  const { pending, failed, syncing, lastError } = useSyncStatus();

  if (failed > 0) {
    return (
      <button
        onClick={async () => {
          await resetFailed(MAX_ATTEMPTS);
          syncNow();
        }}
        className="rounded-full bg-red-200 px-3 py-1 text-sm"
      >
        {failed} failed, tap to retry
      </button>
    );
  }

  if (pending > 0) {
    return (
      <span
        className="rounded-full bg-amber-200 px-3 py-1 text-sm"
        title={lastError ?? undefined}
      >
        {syncing ? "Syncing..." : `${pending} unsynced`}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-green-200 px-3 py-1 text-sm">
      All synced
    </span>
  );
}
