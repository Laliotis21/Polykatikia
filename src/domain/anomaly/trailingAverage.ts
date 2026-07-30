import { assertCents } from "@/domain/money";

export const MIN_ANOMALY_SAMPLES = 3;

/** Integer mean of sample cents (trunc toward zero). Empty → 0. */
export function trailingAverageCents(samples: number[]): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const s of samples) {
    sum += assertCents(s);
  }
  return Math.trunc(sum / samples.length);
}
