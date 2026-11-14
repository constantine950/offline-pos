import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/dexie";
import { formatNaira } from "../../lib/money";
import { METHOD_LABEL, startOfToday, summarize } from "./reportService";
import type { PaymentMethod } from "../../types";

export function DailyReport() {
  // The date string in deps makes this refresh itself after midnight.
  const sales = useLiveQuery(
    () => db.sales.where("createdAt").aboveOrEqual(startOfToday()).toArray(),
    [new Date().toDateString()],
  );

  if (!sales) return null;
  const s = summarize(sales);

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="text-sm text-neutral-500">Today</div>
      <div className="text-2xl font-bold">{formatNaira(s.totalKobo)}</div>
      <div className="text-sm text-neutral-500">
        {s.count} {s.count === 1 ? "sale" : "sales"}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-sm">
        {(Object.keys(s.byMethod) as PaymentMethod[]).map((m) => (
          <div key={m}>
            <div className="text-xs text-neutral-500">{METHOD_LABEL[m]}</div>
            <div className="font-medium">{formatNaira(s.byMethod[m])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
