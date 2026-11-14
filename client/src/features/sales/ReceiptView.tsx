import { formatNaira } from "../../lib/money";
import { METHOD_LABEL } from "../reports/reportService";
import type { Sale } from "../../types";

const dateFmt = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function receiptText(sale: Sale): string {
  return [
    `Receipt ${sale.receiptNo}`,
    dateFmt.format(sale.createdAt),
    "",
    ...sale.items.map(
      (i) => `${i.qty} x ${i.name} - ${formatNaira(i.unitPriceKobo * i.qty)}`,
    ),
    "",
    `Total: ${formatNaira(sale.totalKobo)}`,
    `Paid by: ${METHOD_LABEL[sale.paymentMethod]}`,
    "",
    "Thank you!",
  ].join("\n");
}

export function ReceiptView({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="print-area font-mono text-sm">
          <div className="text-center font-bold">Offline POS</div>
          <div className="text-center text-xs text-neutral-500">
            {dateFmt.format(sale.createdAt)}
          </div>
          <div className="mb-3 text-center text-xs">
            Receipt {sale.receiptNo}
          </div>

          <div className="border-y border-dashed py-2">
            {sale.items.map((i, idx) => (
              <div key={idx} className="flex justify-between gap-2 py-0.5">
                <span>
                  {i.qty} x {i.name}
                </span>
                <span>{formatNaira(i.unitPriceKobo * i.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatNaira(sale.totalKobo)}</span>
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Paid by</span>
            <span>{METHOD_LABEL[sale.paymentMethod]}</span>
          </div>
          <div className="mt-3 text-center text-xs">Thank you!</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Print
          </button>
          <button
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(receiptText(sale))}`,
                "_blank",
              )
            }
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
          >
            WhatsApp
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-200 px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
