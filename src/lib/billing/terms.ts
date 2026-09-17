export const BILLING_TERMS = [3, 6, 12] as const;
export type BillingMonths = (typeof BILLING_TERMS)[number];

export function termTotal(monthlySar: number, months: number) {
  if (
    ![1, ...BILLING_TERMS].includes(months) ||
    !Number.isInteger(monthlySar) ||
    monthlySar <= 0
  )
    throw new Error("INVALID_TERM");
  return monthlySar * (months === 12 ? 10 : months);
}
export function sar(value: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(
    value,
  );
}
export function termLabel(months: number) {
  return months === 12
    ? "سنة كاملة"
    : months === 6
      ? "6 أشهر"
      : months === 3
        ? "3 أشهر"
        : "شهر — اشتراك سابق";
}
