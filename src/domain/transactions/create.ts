import type {
  Prisma,
  PrismaClient,
  Transaction,
  TransactionType,
} from "@prisma/client";
import { assertCents } from "@/domain/money";
import { appendAuditLog } from "@/domain/audit";
import { createAlert, sendAlertNotifyEvent } from "@/domain/alerts";
import { evaluateExpenseAnomalyForBuilding } from "@/domain/anomaly";
import {
  assertMismatchJustification,
  needsMismatchJustification,
} from "./mismatch";

export type CreateTransactionInput = {
  buildingId: string;
  type: TransactionType;
  amountCents: number;
  occurredAt: Date;
  categoryId?: string | null;
  apartmentId?: string | null;
  receiptId?: string | null;
  description?: string | null;
  mismatchJustification?: string | null;
  createdById: string;
};

export type CreatedAlertSummary = {
  id: string;
  type: string;
  severity: string;
};

export type CreateTransactionResult = {
  transaction: Transaction;
  alerts: CreatedAlertSummary[];
  anomalyFired: boolean;
  mismatchOverride: boolean;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

function hasRootTransaction(db: DbClient): db is PrismaClient {
  return typeof (db as PrismaClient).$transaction === "function";
}

/**
 * Create transaction with integrity gates inside one Prisma `$transaction`:
 * mismatch justification → Transaction → Audit → OCR_MISMATCH alert → anomaly hook.
 *
 * Uses Agent 3 contracts:
 * - `appendAuditLog(input, tx)` with `before`/`after`
 * - `createAlert(input, tx)` with `enqueueNotify: false`
 * - `evaluateExpenseAnomalyForBuilding(tx, …)` when category present
 * Then enqueues `sendAlertNotifyEvent` after commit for each HIGH alert.
 */
export async function createTransactionWithIntegrity(
  db: DbClient,
  input: CreateTransactionInput,
): Promise<CreateTransactionResult> {
  assertCents(input.amountCents);
  if (input.amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }

  const run = async (
    tx: Prisma.TransactionClient,
  ): Promise<CreateTransactionResult> => {
    let ocrAmountCents: number | null = null;

    if (input.receiptId) {
      const receipt = await tx.receipt.findUnique({
        where: { id: input.receiptId },
        select: {
          id: true,
          buildingId: true,
          ocrAmountCents: true,
          transaction: { select: { id: true } },
        },
      });
      if (!receipt) {
        throw new Error("Receipt not found");
      }
      if (receipt.buildingId !== input.buildingId) {
        throw new Error("Receipt does not belong to building");
      }
      if (receipt.transaction) {
        throw new Error("Receipt is already linked to a transaction");
      }
      ocrAmountCents = receipt.ocrAmountCents;
    }

    assertMismatchJustification({
      amountCents: input.amountCents,
      ocrAmountCents,
      justification: input.mismatchJustification,
    });

    const mismatchOverride = needsMismatchJustification({
      amountCents: input.amountCents,
      ocrAmountCents,
    });

    const transaction = await tx.transaction.create({
      data: {
        buildingId: input.buildingId,
        type: input.type,
        amountCents: input.amountCents,
        occurredAt: input.occurredAt,
        categoryId: input.categoryId ?? null,
        apartmentId: input.apartmentId ?? null,
        receiptId: input.receiptId ?? null,
        description: input.description ?? null,
        mismatchJustification: mismatchOverride
          ? (input.mismatchJustification?.trim() ?? null)
          : null,
        createdById: input.createdById,
      },
    });

    await appendAuditLog(
      {
        actorId: input.createdById,
        action: "TRANSACTION_CREATED",
        entityType: "Transaction",
        entityId: transaction.id,
        after: {
          amountCents: input.amountCents,
          type: input.type,
          buildingId: input.buildingId,
          receiptId: input.receiptId ?? null,
        },
      },
      tx,
    );

    const alerts: CreatedAlertSummary[] = [];

    if (mismatchOverride) {
      const alert = await createAlert(
        {
          buildingId: input.buildingId,
          transactionId: transaction.id,
          type: "OCR_MISMATCH",
          severity: "HIGH",
          title: "OCR amount override",
          body: `Operator amount ${input.amountCents}¢ differs from OCR ${ocrAmountCents}¢. Justification recorded.`,
          enqueueNotify: false,
        },
        tx,
      );
      alerts.push({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
      });

      await appendAuditLog(
        {
          actorId: input.createdById,
          action: "OCR_AMOUNT_OVERRIDE",
          entityType: "Transaction",
          entityId: transaction.id,
          before: { ocrAmountCents },
          after: {
            amountCents: input.amountCents,
            mismatchJustification:
              input.mismatchJustification?.trim() ?? null,
            alertId: alert.id,
          },
        },
        tx,
      );
    }

    let anomalyFired = false;
    if (input.type === "EXPENSE" && input.categoryId) {
      const anomaly = await evaluateExpenseAnomalyForBuilding(tx, {
        buildingId: input.buildingId,
        categoryId: input.categoryId,
        amountCents: input.amountCents,
        occurredAt: input.occurredAt,
      });
      if (anomaly.isAnomaly) {
        anomalyFired = true;
        const alert = await createAlert(
          {
            buildingId: input.buildingId,
            transactionId: transaction.id,
            type: "ANOMALY",
            severity: "HIGH",
            title: "Expense anomaly",
            body: `Amount ${input.amountCents}¢ exceeds trailing category average (${anomaly.avgCents}¢ avg, margin ${anomaly.marginBps} bps).`,
            enqueueNotify: false,
          },
          tx,
        );
        alerts.push({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
        });
      }
    }

    return { transaction, alerts, anomalyFired, mismatchOverride };
  };

  const result = hasRootTransaction(db)
    ? await db.$transaction(run)
    : await run(db);

  // After commit: enqueue admin notify for each HIGH alert created in-tx.
  for (const alert of result.alerts) {
    try {
      await sendAlertNotifyEvent(alert.id);
    } catch {
      // Inngest may be unconfigured locally; alerts are already persisted.
    }
  }

  return result;
}
