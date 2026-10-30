// All money is stored as integer kobo. Never floats.
export const toKobo = (naira: number) => Math.round(naira * 100);

export const formatNaira = (kobo: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
