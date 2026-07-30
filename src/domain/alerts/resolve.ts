import type { Alert, AlertStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { appendAuditLog } from "@/domain/audit";

export type DbClient = PrismaClient | Prisma.TransactionClient;

function client(db?: DbClient | null): DbClient {
  return db ?? prisma;
}

export type AckOrResolveAlertInput = {
  alertId: string;
  actorId: string;
  status: Extract<AlertStatus, "ACKED" | "RESOLVED">;
};

/**
 * ADMIN ack/resolve. Writes ALERT_ACKED / ALERT_RESOLVED audit entry.
 */
export async function ackOrResolveAlert(
  input: AckOrResolveAlertInput,
  db?: DbClient | null,
): Promise<Alert> {
  const tx = client(db);
  const existing = await tx.alert.findUnique({ where: { id: input.alertId } });
  if (!existing) {
    throw new Error("Alert not found");
  }

  const resolvedAt =
    input.status === "RESOLVED" ? new Date() : existing.resolvedAt;
  const resolvedById =
    input.status === "RESOLVED" ? input.actorId : existing.resolvedById;

  const updated = await tx.alert.update({
    where: { id: input.alertId },
    data: {
      status: input.status,
      resolvedAt,
      resolvedById,
    },
  });

  const action =
    input.status === "ACKED" ? "ALERT_ACKED" : "ALERT_RESOLVED";

  await appendAuditLog(
    {
      actorId: input.actorId,
      action,
      entityType: "Alert",
      entityId: updated.id,
      before: { status: existing.status },
      after: { status: updated.status },
    },
    tx,
  );

  return updated;
}

/** Convenience wrappers */
export async function ackAlert(
  alertId: string,
  actorId: string,
  db?: DbClient | null,
): Promise<Alert> {
  return ackOrResolveAlert({ alertId, actorId, status: "ACKED" }, db);
}

export async function resolveAlert(
  alertId: string,
  actorId: string,
  db?: DbClient | null,
): Promise<Alert> {
  return ackOrResolveAlert({ alertId, actorId, status: "RESOLVED" }, db);
}
