import { assertCents } from "./cents";

/** Format EUR from integer cents using locale (default el-GR). */
export function formatEurFromCents(cents: number, locale = "el-GR"): string {
  assertCents(cents);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
