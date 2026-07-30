import type {
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendAlertNotifyEvent } from "@/inngest/events";

export type DbClient = PrismaClient | Prisma.TransactionClient;

function client(db?: DbClient | null): DbClient {
  return db ?? prisma;
}

/** Schema AlertType is OCR_MISMATCH | ANOMALY (OVERDUE is DunningNotice, not Alert). */
export type CreateAlertInput = {
  type: AlertType;
  title: string;
  body?: string | null;
  buildingId?: string | null;
  transactionId?: string | null;
  severity?: AlertSeverity;
  /**
   * When true (default), enqueue Inngest `alerts/notify-admin` after create
   * for HIGH OCR_MISMATCH / ANOMALY. Set false inside a DB transaction and
   * call {@link sendAlertNotifyEvent} after commit.
   */
  enqueueNotify?: boolean;
};

export type CreateAlertResult = Alert;

/**
 * Create an alert. Default severity HIGH.
 * For Agent 2 `$transaction` path: pass `db` + `enqueueNotify: false`, then
 * call `sendAlertNotifyEvent(alert.id)` after the transaction commits.
 */
export async function createAlert(
  input: CreateAlertInput,
  db?: DbClient | null,
): Promise<CreateAlertResult> {
  const severity = input.severity ?? "HIGH";
  const enqueueNotify = input.enqueueNotify ?? true;

  const alert = await client(db).alert.create({
    data: {
      type: input.type,
      severity,
      status: "OPEN",
      title: input.title,
      body: input.body ?? null,
      buildingId: input.buildingId ?? null,
      transactionId: input.transactionId ?? null,
    },
  });

  if (
    enqueueNotify &&
    severity === "HIGH" &&
    (alert.type === "OCR_MISMATCH" || alert.type === "ANOMALY")
  ) {
    await sendAlertNotifyEvent(alert.id);
  }

  return alert;
}

export async function listOpenAlerts(
  db?: DbClient | null,
  opts?: { buildingId?: string; limit?: number },
): Promise<Alert[]> {
  return client(db).alert.findMany({
    where: {
      status: "OPEN",
      ...(opts?.buildingId ? { buildingId: opts.buildingId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
}

export async function listAlerts(
  db?: DbClient | null,
  opts?: {
    status?: AlertStatus | AlertStatus[];
    buildingId?: string;
    limit?: number;
  },
): Promise<Alert[]> {
  const statusFilter = opts?.status
    ? Array.isArray(opts.status)
      ? { in: opts.status }
      : opts.status
    : undefined;

  return client(db).alert.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(opts?.buildingId ? { buildingId: opts.buildingId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });
}
