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
  assertReceiptAmountMatchesOcr,
  assertReceiptOcrLinkable,
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
  /** @deprecated Ignored — receipt amounts must equal OCR; kept for API compat. */
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
  /** Always false — mismatch override path removed (amount integrity). */
  mismatchOverride: boolean;
  /**
   * When false, caller passed a TransactionClient (nested). Alerts were
   * created with `enqueueNotify: false`; caller must
   * `sendAlertNotifyEvent` after the outermost commit.
   */
  notifiedAfterCommit: boolean;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

function hasRootTransaction(db: DbClient): db is PrismaClient {
  return typeof (db as PrismaClient).$transaction === "function";
}

/**
 * Create transaction with integrity gates inside one Prisma `$transaction`:
 * receipt OCR lock → Transaction → Audit → anomaly hook.
 *
 * Uses Agent 3 contracts:
 * - `appendAuditLog(input, tx)` with `before`/`after`
 * - `createAlert(input, tx)` with `enqueueNotify: false`
 * - `evaluateExpenseAnomalyForBuilding(tx, …)` when category present
 * Then enqueues `sendAlertNotifyEvent` after commit for each HIGH alert
 * **only when this call owns the outer `$transaction`**. Nested
 * TransactionClient callers must notify after their outermost commit.
 *
 * Notify failures: after commit, `appendAuditLog(NOTIFY_FAILED)` then rethrow
 * (tx data is already durable; admin email must not be silently dropped).
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
  ): Promise<Omit<CreateTransactionResult, "notifiedAfterCommit">> => {
    if (input.receiptId) {
      const receipt = await tx.receipt.findUnique({
        where: { id: input.receiptId },
        select: {
          id: true,
          buildingId: true,
          status: true,
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
      assertReceiptOcrLinkable({
        receiptStatus: receipt.status,
        ocrAmountCents: receipt.ocrAmountCents,
      });
      assertReceiptAmountMatchesOcr({
        amountCents: input.amountCents,
        ocrAmountCents: receipt.ocrAmountCents!,
      });
    }

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
        mismatchJustification: null,
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
    const mismatchOverride = false;

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

  const ownsOuterCommit = hasRootTransaction(db);
  const result = ownsOuterCommit
    ? await db.$transaction(run)
    : await run(db);

  // After outermost commit only: enqueue admin notify for each HIGH alert.
  // Nested TransactionClient: caller must notify after their commit.
  if (ownsOuterCommit) {
    for (const alert of result.alerts) {
      try {
        await sendAlertNotifyEvent(alert.id);
      } catch (err) {
        // Tx already committed — persist failure visibility, then surface.
        await appendAuditLog({
          actorId: input.createdById,
          action: "NOTIFY_FAILED",
          entityType: "Alert",
          entityId: alert.id,
          after: {
            error: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      }
    }
  }

  return { ...result, notifiedAfterCommit: ownsOuterCommit };
}
