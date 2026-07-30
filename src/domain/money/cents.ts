/** Assert value is finite integer cents. Never accept floats. */
export function assertCents(value: number): number {
  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    throw new Error("Money must be integer cents");
  }
  return value;
}

export function addCents(a: number, b: number): number {
  return assertCents(a) + assertCents(b);
}

/** amountCents * bps / 10000, integer truncation toward zero */
export function mulBps(amountCents: number, bps: number): number {
  assertCents(amountCents);
  if (!Number.isInteger(bps)) {
    throw new Error("bps must be integer");
  }
  return Math.trunc((amountCents * bps) / 10000);
}
