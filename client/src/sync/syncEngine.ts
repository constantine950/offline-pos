import { create } from "zustand";
import { db } from "../db/dexie";
import { backfillOnce } from "./outbox";
import { pushOutbox } from "./push";

interface SyncState {
  syncing: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
}

export const useSyncState = create<SyncState>(() => ({
  syncing: false,
  lastSyncedAt: null,
  lastError: null,
}));

let running = false;

export async function syncNow() {
  if (running) return;
  running = true;
  useSyncState.setState({ syncing: true });
  try {
    await backfillOnce();
    await pushOutbox();
    useSyncState.setState({ lastSyncedAt: Date.now(), lastError: null });
  } catch (e) {
    const msg =
      e instanceof TypeError || (e as Error).name === "TimeoutError"
        ? "Can't reach the server"
        : (e as Error).message;
    useSyncState.setState({ lastError: msg });
  } finally {
    running = false;
    useSyncState.setState({ syncing: false });
  }
}

let started = false;

export function startSyncEngine() {
  if (started) return;
  started = true;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const syncSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(syncNow, 800);
  };

  // New outbox entry => sync shortly after (debounced, so a 5-item sale = one request)
  db.outbox.hook("creating", () => {
    syncSoon();
  });

  window.addEventListener("online", syncNow);
  setInterval(syncNow, 15000);
  syncNow();
}
