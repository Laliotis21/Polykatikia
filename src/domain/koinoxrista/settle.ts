import type {
  AllocationMethod,
  HeatingAllocation,
  Prisma,
  PrismaClient,
  SettlementStatus,
} from "@prisma/client";
import { appendAuditLog } from "@/domain/audit";
import { sendAlertNotifyEvent } from "@/domain/alerts";
import {
  athensLocalToUtc,
  buildKoinoxristaStatement,
  monthAthensRange,
  type HeatingAllocationMode,
  type KoinoxristaStatement,
} from "./allocate";
import {
  KoinoxristaError,
  MSG_ALREADY_FINALIZED,
  MSG_EMPTY_FINALIZE,
  MSG_MISSING_HEATING_READINGS,
} from "./errors";
import { mintRecurringExpensesForPeriod } from "@/domain/recurring";
import type { CreatedAlertSummary } from "@/domain/transactions";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type PreviewKoinoxristaResult = {
  buildingId: string;
  year: number;
  month: number;
  from: string;
  to: string;
  heatingAllocation: HeatingAllocationMode;
  existingSettlement: {
    id: string;
    status: SettlementStatus;
    totalCents: number;
    finalizedAt: string | null;
  } | null;
  statement: KoinoxristaStatement;
};

/**
 * Block finalize when building requires meters but period has no readings
 * and there is a positive HEATING_SHARES expense to allocate.
 */
export function assertHeatingReadingsForFinalize(input: {
  heatingAllocation: HeatingAllocation | HeatingAllocationMode;
  hasHeatingExpense: boolean;
  meterRowCount: number;
}): void {
  if (
    input.heatingAllocation === "METER_READINGS" &&
    input.hasHeatingExpense &&
    input.meterRowCount === 0
  ) {
    throw new KoinoxristaError(MSG_MISSING_HEATING_READINGS, 400);
  }
}

async function loadPeriodInputs(
  db: DbClient,
  input: { buildingId: string; year: number; month: number },
) {
  const { buildingId, year, month } = input;
  const { from, to } = monthAthensRange(year, month);

  const [building, apartments, expenses, existing, meterRows] =
    await Promise.all([
      db.building.findUniqueOrThrow({
        where: { id: buildingId },
        select: { heatingAllocation: true },
      }),
      db.apartment.findMany({
        where: { buildingId },
        orderBy: { label: "asc" },
        select: {
          id: true,
          label: true,
          shareBps: true,
          elevatorShareBps: true,
          heatingShareBps: true,
        },
      }),
      db.transaction.findMany({
        where: {
          buildingId,
          type: "EXPENSE",
          occurredAt: { gte: from, lt: to },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              code: true,
              allocationMethod: true,
            },
          },
        },
        orderBy: { occurredAt: "asc" },
      }),
      db.commonExpenseSettlement.findUnique({
        where: {
          buildingId_year_month: { buildingId, year, month },
        },
        select: {
          id: true,
          status: true,
          totalCents: true,
          finalizedAt: true,
        },
      }),
      db.heatingMeterReading.findMany({
        where: { buildingId, year, month },
        select: { apartmentId: true, units: true },
      }),
    ]);

  const heatingAllocation =
    building.heatingAllocation as HeatingAllocationMode;
  const usesMeters = heatingAllocation === "METER_READINGS";

  // Building config drives mode — readings ignored when FIXED_SHARES.
  const heatingMeterUnitsByApartmentId = usesMeters
    ? new Map(meterRows.map((r) => [r.apartmentId, r.units]))
    : null;

  const mappedExpenses = expenses.map((e) => ({
    id: e.id,
    amountCents: e.amountCents,
    categoryId: e.categoryId,
    allocationMethod: (e.category?.allocationMethod ??
      "GENERAL_SHARES") as AllocationMethod,
    categoryName: e.category?.name ?? null,
    categoryCode: e.category?.code ?? null,
  }));

  const hasHeatingExpense = mappedExpenses.some(
    (e) =>
      e.categoryId != null &&
      e.allocationMethod === "HEATING_SHARES" &&
      e.amountCents > 0,
  );

  return {
    from,
    to,
    apartments,
    expenses,
    existing,
    heatingAllocation,
    hasHeatingExpense,
    meterRowCount: meterRows.length,
    mappedExpenses,
    heatingMeterUnitsByApartmentId,
  };
}

function buildStatementFromLoaded(
  loaded: Awaited<ReturnType<typeof loadPeriodInputs>>,
  expenses = loaded.mappedExpenses,
): KoinoxristaStatement {
  return buildKoinoxristaStatement({
    apartments: loaded.apartments,
    expenses,
    heatingAllocation: loaded.heatingAllocation,
    heatingMeterUnitsByApartmentId: loaded.heatingMeterUnitsByApartmentId,
  });
}

export async function previewKoinoxrista(
  db: DbClient,
  input: {
    buildingId: string;
    year: number;
    month: number;
    /** When set, mint missing active πάγια before building the statement. */
    createdById?: string;
  },
): Promise<PreviewKoinoxristaResult> {
  const { buildingId, year, month } = input;
  if (input.createdById) {
    await mintRecurringExpensesForPeriod(db, {
      buildingId,
      year,
      month,
      createdById: input.createdById,
    });
  }
  const loaded = await loadPeriodInputs(db, input);

  let statement: KoinoxristaStatement;
  try {
    statement = buildStatementFromLoaded(loaded);
  } catch (err) {
    // Draft preview with warning: allocate non-heating buckets when meters missing.
    if (
      err instanceof KoinoxristaError &&
      err.message === MSG_MISSING_HEATING_READINGS
    ) {
      statement = buildStatementFromLoaded(
        loaded,
        loaded.mappedExpenses.filter(
          (e) => e.allocationMethod !== "HEATING_SHARES",
        ),
      );
    } else {
      throw err;
    }
  }

  return {
    buildingId,
    year,
    month,
    from: loaded.from.toISOString(),
    to: loaded.to.toISOString(),
    heatingAllocation: loaded.heatingAllocation,
    existingSettlement: loaded.existing
      ? {
          id: loaded.existing.id,
          status: loaded.existing.status,
          totalCents: loaded.existing.totalCents,
          finalizedAt: loaded.existing.finalizedAt?.toISOString() ?? null,
        }
      : null,
    statement,
  };
}

export type FinalizeKoinoxristaResult = {
  settlementId: string;
  totalCents: number;
  chargeTransactionIds: string[];
  statement: KoinoxristaStatement;
};

function periodLabel(year: number, month: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}

function chargeOccurredAtForPeriod(year: number, month: number): Date {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return athensLocalToUtc(year, month, lastDay, 12, 0, 0);
}

/**
 * Alert IDs from nested mint that still need `sendAlertNotifyEvent`
 * after the outermost commit. Empty when mint already notified.
 */
export function pendingMintNotifyAlertIds(mint: {
  alerts: CreatedAlertSummary[];
  notifiedAfterCommit: boolean;
}): string[] {
  if (mint.notifiedAfterCommit) return [];
  return mint.alerts.map((a) => a.id);
}

/**
 * Persist settlement lines and create per-apartment CHARGE transactions.
 * Idempotent guard: refuses if a FINALIZED settlement already exists for the period.
 * Refuses empty finalize (nothing to allocate).
 *
 * Nested πάγια mint runs inside `$transaction` with `enqueueNotify: false`;
 * HIGH alerts are notified via `sendAlertNotifyEvent` after commit.
 */
export async function finalizeKoinoxristaSettlement(
  db: PrismaClient,
  input: {
    buildingId: string;
    year: number;
    month: number;
    createdById: string;
  },
): Promise<FinalizeKoinoxristaResult> {
  const label = periodLabel(input.year, input.month);
  const chargeOccurredAt = chargeOccurredAtForPeriod(input.year, input.month);

  const result = await db.$transaction(async (tx) => {
    // Serialize concurrent finalize for this building (TOCTOU / P2002 races).
    await tx.$queryRaw`SELECT id FROM "Building" WHERE id = ${input.buildingId} FOR UPDATE`;

    const existing = await tx.commonExpenseSettlement.findUnique({
      where: {
        buildingId_year_month: {
          buildingId: input.buildingId,
          year: input.year,
          month: input.month,
        },
      },
      select: { id: true, status: true },
    });

    if (existing?.status === "FINALIZED") {
      throw new KoinoxristaError(MSG_ALREADY_FINALIZED, 409);
    }

    // Mint missing active πάγια so they appear in period expenses.
    // Nested TransactionClient → createTransactionWithIntegrity skips notify.
    const mintResult = await mintRecurringExpensesForPeriod(tx, {
      buildingId: input.buildingId,
      year: input.year,
      month: input.month,
      createdById: input.createdById,
    });

    // Rebuild statement under the lock before mutating.
    const loaded = await loadPeriodInputs(tx, input);
    assertHeatingReadingsForFinalize({
      heatingAllocation: loaded.heatingAllocation,
      hasHeatingExpense: loaded.hasHeatingExpense,
      meterRowCount: loaded.meterRowCount,
    });
    const statement = buildStatementFromLoaded(loaded);

    const allocatable = statement.apartmentStatements.reduce(
      (sum, s) => sum + s.totalCents,
      0,
    );
    if (allocatable === 0) {
      throw new KoinoxristaError(MSG_EMPTY_FINALIZE, 400);
    }

    if (existing) {
      // Cascade deletes linked CHARGE txs via settlementId FK.
      await tx.commonExpenseSettlementLine.deleteMany({
        where: { settlementId: existing.id },
      });
      await tx.commonExpenseSettlement.delete({
        where: { id: existing.id },
      });
    }

    // Orphan CHARGEs from a prior attempt without settlementId (description match).
    await tx.transaction.deleteMany({
      where: {
        buildingId: input.buildingId,
        type: "CHARGE",
        description: { startsWith: `Κοινόχρηστα ${label}` },
      },
    });

    const settlement = await tx.commonExpenseSettlement.create({
      data: {
        buildingId: input.buildingId,
        year: input.year,
        month: input.month,
        status: "FINALIZED",
        totalCents: allocatable,
        createdById: input.createdById,
        finalizedAt: new Date(),
        lines: {
          create: statement.lines.map((line) => ({
            apartmentId: line.apartmentId,
            categoryId: line.categoryId,
            amountCents: line.amountCents,
            shareUsedBps: line.shareUsedBps,
            expenseIds: line.expenseIds,
          })),
        },
      },
    });

    const chargeTransactionIds: string[] = [];

    for (const aptStmt of statement.apartmentStatements) {
      if (aptStmt.totalCents <= 0) continue;

      const charge = await tx.transaction.create({
        data: {
          buildingId: input.buildingId,
          apartmentId: aptStmt.apartmentId,
          settlementId: settlement.id,
          type: "CHARGE",
          amountCents: aptStmt.totalCents,
          description: `Κοινόχρηστα ${label} · ${aptStmt.apartmentLabel}`,
          occurredAt: chargeOccurredAt,
          createdById: input.createdById,
        },
      });
      chargeTransactionIds.push(charge.id);

      await appendAuditLog(
        {
          actorId: input.createdById,
          action: "KOINOXRISTA_CHARGE_CREATED",
          entityType: "Transaction",
          entityId: charge.id,
          after: {
            settlementId: settlement.id,
            apartmentId: aptStmt.apartmentId,
            amountCents: aptStmt.totalCents,
            period: label,
          },
        },
        tx,
      );
    }

    await appendAuditLog(
      {
        actorId: input.createdById,
        action: "KOINOXRISTA_SETTLEMENT_FINALIZED",
        entityType: "CommonExpenseSettlement",
        entityId: settlement.id,
        after: {
          buildingId: input.buildingId,
          year: input.year,
          month: input.month,
          totalCents: allocatable,
          chargeCount: chargeTransactionIds.length,
        },
      },
      tx,
    );

    return {
      settlementId: settlement.id,
      totalCents: allocatable,
      chargeTransactionIds,
      statement,
      pendingNotifyAlertIds: pendingMintNotifyAlertIds(mintResult),
    };
  });

  // After outermost commit: enqueue admin notify for HIGH alerts from nested mint.
  for (const alertId of result.pendingNotifyAlertIds) {
    try {
      await sendAlertNotifyEvent(alertId);
    } catch (err) {
      await appendAuditLog({
        actorId: input.createdById,
        action: "NOTIFY_FAILED",
        entityType: "Alert",
        entityId: alertId,
        after: {
          error: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    }
  }

  return {
    settlementId: result.settlementId,
    totalCents: result.totalCents,
    chargeTransactionIds: result.chargeTransactionIds,
    statement: result.statement,
  };
}
