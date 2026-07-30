import { assertCents, mulBps } from "@/domain/money";
import { MIN_ANOMALY_SAMPLES, trailingAverageCents } from "./trailingAverage";

export const DEFAULT_ANOMALY_MARGIN_BPS = 3000;

export type EvaluateExpenseAnomalyInput = {
  amountCents: number;
  /** Prior EXPENSE amounts for (buildingId, categoryId) in trailing window */
  priorAmountCents: number[];
  marginBps?: number;
};

export type EvaluateExpenseAnomalyResult = {
  isAnomaly: boolean;
  avgCents: number;
  amountCents: number;
  marginBps: number;
  sampleCount: number;
  /** Present when history is too thin to flag */
  reason?: "insufficient_history";
};

/**
 * Flag if amountCents > avg * (1 + marginBps/10000).
 * Integer path: amountCents > avgCents + mulBps(avgCents, marginBps).
 * Uses `>` (not `>=`). Requires ≥ {@link MIN_ANOMALY_SAMPLES} prior samples.
 */
export function evaluateExpenseAnomaly(
  input: EvaluateExpenseAnomalyInput,
): EvaluateExpenseAnomalyResult {
  const amountCents = assertCents(input.amountCents);
  const marginBps = input.marginBps ?? DEFAULT_ANOMALY_MARGIN_BPS;
  if (!Number.isInteger(marginBps)) {
    throw new Error("marginBps must be integer");
  }

  const sampleCount = input.priorAmountCents.length;
  const avgCents = trailingAverageCents(input.priorAmountCents);

  if (sampleCount < MIN_ANOMALY_SAMPLES) {
    return {
      isAnomaly: false,
      avgCents,
      amountCents,
      marginBps,
      sampleCount,
      reason: "insufficient_history",
    };
  }

  const thresholdCents = avgCents + mulBps(avgCents, marginBps);
  const isAnomaly = amountCents > thresholdCents;

  return {
    isAnomaly,
    avgCents,
    amountCents,
    marginBps,
    sampleCount,
  };
}

/** Alias for Agent 2 transaction-create merge. */
export const evaluateAnomaly = evaluateExpenseAnomaly;
