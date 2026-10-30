import { db } from "../db/dexie";

// Client-generated IDs are what make offline creation possible.
export const newId = () => crypto.randomUUID();

// Stable per-browser identity, used to tag every record with where it came from.
export async function getDeviceId(): Promise<string> {
  const row = await db.meta.get("deviceId");
  if (row) return row.value as string;
  const id = newId();
  await db.meta.put({ key: "deviceId", value: id });
  return id;
}

export async function nextReceiptNo(): Promise<string> {
  const deviceId = await getDeviceId();
  const row = await db.meta.get("receiptCounter");
  const n = ((row?.value as number) ?? 0) + 1;
  await db.meta.put({ key: "receiptCounter", value: n });
  // Device prefix means two offline tills never generate the same number.
  return `${deviceId.slice(0, 4).toUpperCase()}-${String(n).padStart(5, "0")}`;
}
