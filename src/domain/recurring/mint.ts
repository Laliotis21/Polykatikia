import type { Prisma, PrismaClient } from "@prisma/client";
import {
  createTransactionWithIntegrity,
  type CreatedAlertSummary,
} from "@/domain/transactions";
import { athensLocalToUtc } from "@/domain/koinoxrista/allocate";

export type RecurringTemplate = {
  id: string;
  buildingId: string;
  categoryId: string;
  label: string;
  amountCents: number;
  active: boolean;
  dayOfMonth?: number;
};

export type RecurringMintPlan = {
  recurringExpenseId: string;
  buildingId: string;
  categoryId: string;
  amountCents: number;
  description: string;
  year: number;
  month: number;
};

export type MintRecurringResult = {
  mintedIds: string[];
  /** Alerts from nested creates; notify after outer commit when notifiedAfterCommit is false. */
  alerts: CreatedAlertSummary[];
  /**
   * True when mint ran on a PrismaClient (each create owned its `$transaction`
   * and already called `sendAlertNotifyEvent`). False when nested in a
   * TransactionClient — caller must notify after outermost commit.
   */
  notifiedAfterCommit: boolean;
};

/** Pure planner: active templates not yet minted for the period. */
export function planRecurringMints(input: {
  year: number;
  month: number;
  templates: RecurringTemplate[];
  alreadyMintedRecurringIds: Set<string>;
}): RecurringMintPlan[] {
  const plans: RecurringMintPlan[] = [];
  for (const t of input.templates) {
    if (!t.active) continue;
    if (input.alreadyMintedRecurringIds.has(t.id)) continue;
    plans.push({
      recurringExpenseId: t.id,
      buildingId: t.buildingId,
      categoryId: t.categoryId,
      amountCents: t.amountCents,
      description: t.label,
      year: input.year,
      month: input.month,
    });
  }
  return plans;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

function occurredAtForMint(
  year: number,
  month: number,
  dayOfMonth: number,
): Date {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(dayOfMonth, 1), Math.min(28, lastDay));
  return athensLocalToUtc(year, month, day, 12, 0, 0);
}

/**
 * Idempotent: create missing EXPENSE rows for active πάγια in the period.
 * Uses unique (recurringExpenseId, year, month) at DB layer.
 */
export async function mintRecurringExpensesForPeriod(
  db: DbClient,
  input: {
    buildingId: string;
    year: number;
    month: number;
    createdById: string;
  },
): Promise<MintRecurringResult> {
  const templates = await db.recurringExpense.findMany({
    where: { buildingId: input.buildingId, active: true },
    select: {
      id: true,
      buildingId: true,
      categoryId: true,
      label: true,
      amountCents: true,
      active: true,
      dayOfMonth: true,
    },
  });

  if (templates.length === 0) {
    return { mintedIds: [], alerts: [], notifiedAfterCommit: true };
  }

  const existing = await db.transaction.findMany({
    where: {
      buildingId: input.buildingId,
      recurringExpenseId: { in: templates.map((t) => t.id) },
      recurringPeriodYear: input.year,
      recurringPeriodMonth: input.month,
    },
    select: { recurringExpenseId: true },
  });

  const alreadyMinted = new Set(
    existing
      .map((e) => e.recurringExpenseId)
      .filter((id): id is string => id != null),
  );

  const plans = planRecurringMints({
    year: input.year,
    month: input.month,
    templates,
    alreadyMintedRecurringIds: alreadyMinted,
  });

  const mintedIds: string[] = [];
  const alerts: CreatedAlertSummary[] = [];
  let notifiedAfterCommit = true;
  const templateById = new Map(templates.map((t) => [t.id, t]));

  for (const plan of plans) {
    const template = templateById.get(plan.recurringExpenseId);
    const dayOfMonth = template?.dayOfMonth ?? 1;
    const result = await createTransactionWithIntegrity(db, {
      buildingId: plan.buildingId,
      type: "EXPENSE",
      amountCents: plan.amountCents,
      occurredAt: occurredAtForMint(plan.year, plan.month, dayOfMonth),
      categoryId: plan.categoryId,
      description: plan.description,
      createdById: input.createdById,
      recurringExpenseId: plan.recurringExpenseId,
      recurringPeriodYear: plan.year,
      recurringPeriodMonth: plan.month,
    });
    mintedIds.push(result.transaction.id);
    alerts.push(...result.alerts);
    // Any nested create means caller must notify after outermost commit.
    if (!result.notifiedAfterCommit) {
      notifiedAfterCommit = false;
    }
  }

  return { mintedIds, alerts, notifiedAfterCommit };
}
