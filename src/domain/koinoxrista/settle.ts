import type {
  AllocationMethod,
  Prisma,
  PrismaClient,
  SettlementStatus,
} from "@prisma/client";
import { appendAuditLog } from "@/domain/audit";
import {
  athensLocalToUtc,
  buildKoinoxristaStatement,
  monthAthensRange,
  type KoinoxristaStatement,
} from "./allocate";
import {
  KoinoxristaError,
  MSG_ALREADY_FINALIZED,
  MSG_EMPTY_FINALIZE,
} from "./errors";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type PreviewKoinoxristaResult = {
  buildingId: string;
  year: number;
  month: number;
  from: string;
  to: string;
  existingSettlement: {
    id: string;
    status: SettlementStatus;
    totalCents: number;
    finalizedAt: string | null;
  } | null;
  statement: KoinoxristaStatement;
};

async function loadPeriodInputs(
  db: DbClient,
  input: { buildingId: string; year: number; month: number },
) {
  const { buildingId, year, month } = input;
  const { from, to } = monthAthensRange(year, month);

  const [apartments, expenses, existing] = await Promise.all([
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
  ]);

  const statement = buildKoinoxristaStatement({
    apartments,
    expenses: expenses.map((e) => ({
      id: e.id,
      amountCents: e.amountCents,
      categoryId: e.categoryId,
      allocationMethod: (e.category?.allocationMethod ??
        "GENERAL_SHARES") as AllocationMethod,
      categoryName: e.category?.name ?? null,
      categoryCode: e.category?.code ?? null,
    })),
  });

  return { from, to, apartments, expenses, existing, statement };
}

export async function previewKoinoxrista(
  db: DbClient,
  input: { buildingId: string; year: number; month: number },
): Promise<PreviewKoinoxristaResult> {
  const { buildingId, year, month } = input;
  const { from, to, existing, statement } = await loadPeriodInputs(db, input);

  return {
    buildingId,
    year,
    month,
    from: from.toISOString(),
    to: to.toISOString(),
    existingSettlement: existing
      ? {
          id: existing.id,
          status: existing.status,
          totalCents: existing.totalCents,
          finalizedAt: existing.finalizedAt?.toISOString() ?? null,
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
 * Persist settlement lines and create per-apartment CHARGE transactions.
 * Idempotent guard: refuses if a FINALIZED settlement already exists for the period.
 * Refuses empty finalize (nothing to allocate).
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

  return db.$transaction(async (tx) => {
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

    // Rebuild statement under the lock before mutating.
    const { statement } = await loadPeriodInputs(tx, input);

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
    };
  });
}
