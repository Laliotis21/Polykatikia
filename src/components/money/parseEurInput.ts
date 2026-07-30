/**
 * Parse a user EUR string into integer cents without float money math.
 * Accepts "12", "12.5", "12.50", "12,50".
 */
export function parseEurInputToCents(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const [wholePart, fracPart = ""] = trimmed.split(".");
  const whole = Number(wholePart);
  if (!Number.isInteger(whole)) return null;
  const frac = Number((fracPart + "00").slice(0, 2));
  if (!Number.isInteger(frac)) return null;
  return whole * 100 + frac;
}

/** Format integer cents as a decimal EUR input string (not locale display). */
export function centsToEurInput(cents: number | null | undefined): string {
  if (cents == null || !Number.isInteger(cents)) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}
