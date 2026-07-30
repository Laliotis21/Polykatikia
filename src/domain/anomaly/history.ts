import type { Prisma, PrismaClient } from "@prisma/client";
import {
  DEFAULT_ANOMALY_MARGIN_BPS,
  evaluateExpenseAnomaly,
  type EvaluateExpenseAnomalyResult,
} from "./evaluate";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export type FetchTrailingExpenseHistoryInput = {
  buildingId: string;
  categoryId: string;
  /** Upper bound exclusive for "prior" txs (usually the new expense occurredAt) */
  before: Date;
  /** Lookback window; default 365 days */
  lookbackDays?: number;
};

/** Load prior EXPENSE amountCents for (buildingId, categoryId) in trailing window. */
export async function fetchTrailingExpenseAmounts(
  db: DbClient,
  input: FetchTrailingExpenseHistoryInput,
): Promise<number[]> {
  const lookbackDays = input.lookbackDays ?? 365;
  const windowStart = new Date(input.before);
  windowStart.setUTCDate(windowStart.getUTCDate() - lookbackDays);

  const rows = await db.transaction.findMany({
    where: {
      buildingId: input.buildingId,
      categoryId: input.categoryId,
      type: "EXPENSE",
      occurredAt: {
        gte: windowStart,
        lt: input.before,
      },
    },
    select: { amountCents: true },
    orderBy: { occurredAt: "asc" },
  });

  return rows.map((r) => r.amountCents);
}

export type EvaluateExpenseAnomalyForBuildingInput = {
  buildingId: string;
  categoryId: string;
  amountCents: number;
  occurredAt: Date;
  marginBps?: number;
  lookbackDays?: number;
};

/**
 * DB-backed anomaly check for Agent 2 create path.
 * Pass `db` as the Prisma `$transaction` client when wrapping with audit/alerts.
 */
export async function evaluateExpenseAnomalyForBuilding(
  db: DbClient,
  input: EvaluateExpenseAnomalyForBuildingInput,
): Promise<EvaluateExpenseAnomalyResult> {
  const priorAmountCents = await fetchTrailingExpenseAmounts(db, {
    buildingId: input.buildingId,
    categoryId: input.categoryId,
    before: input.occurredAt,
    lookbackDays: input.lookbackDays,
  });

  const marginBps = input.marginBps ?? resolveMarginBps();

  return evaluateExpenseAnomaly({
    amountCents: input.amountCents,
    priorAmountCents,
    marginBps,
  });
}

function resolveMarginBps(): number {
  const raw = process.env.ANOMALY_MARGIN_BPS;
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (Number.isInteger(n)) return n;
  }
  return DEFAULT_ANOMALY_MARGIN_BPS;
}
