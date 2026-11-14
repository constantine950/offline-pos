import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/dexie";
import { formatNaira } from "../../lib/money";
import { DailyReport } from "../reports/DailyReport";
import { METHOD_LABEL } from "../reports/reportService";
import { ReceiptView } from "./ReceiptView";
import type { Sale } from "../../types";

const dateFmt = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function SalesHistory() {
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState<Sale | null>(null);

  const sales = useLiveQuery(
    () => db.sales.orderBy("createdAt").reverse().limit(limit).toArray(),
    [limit],
  );
  const total = useLiveQuery(() => db.sales.count(), [], 0);

  return (
    <div className="space-y-4">
      <DailyReport />

      {sales?.length === 0 && (
        <div className="rounded-xl bg-white p-4 text-sm text-neutral-500 shadow">
          No sales yet.
        </div>
      )}

      <div className="space-y-2">
        {sales?.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            className="flex w-full items-center justify-between rounded-xl bg-white p-4 text-left shadow"
          >
            <div>
              <div className="font-medium">{s.receiptNo}</div>
              <div className="text-xs text-neutral-500">
                {dateFmt.format(s.createdAt)} · {s.items.length}{" "}
                {s.items.length === 1 ? "item" : "items"} ·{" "}
                {METHOD_LABEL[s.paymentMethod]}
              </div>
            </div>
            <div className="font-bold">{formatNaira(s.totalKobo)}</div>
          </button>
        ))}
      </div>

      {sales && total > sales.length && (
        <button
          onClick={() => setLimit((l) => l + 50)}
          className="w-full rounded-lg bg-white py-2 text-sm shadow"
        >
          Show more ({total - sales.length} older)
        </button>
      )}

      {selected && (
        <ReceiptView sale={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
