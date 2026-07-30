import type { AuditLog, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export type AppendAuditLogInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export type AppendAuditLogResult = AuditLog;

/**
 * Append-only AuditLog writer.
 * Pass `db` as the Prisma `$transaction` client when composing with tx/alerts.
 */
export async function appendAuditLog(
  input: AppendAuditLogInput,
  db?: DbClient | null,
): Promise<AppendAuditLogResult> {
  const client = db ?? prisma;
  const payload: Prisma.InputJsonValue | undefined =
    input.before !== undefined || input.after !== undefined
      ? ({
          ...(input.before !== undefined ? { before: input.before } : {}),
          ...(input.after !== undefined ? { after: input.after } : {}),
        } as Prisma.InputJsonValue)
      : undefined;

  return client.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload,
    },
  });
}

/** Shape helpers for callers / tests — what we persist in `payload`. */
export function auditPayloadShape(input: {
  before?: unknown;
  after?: unknown;
}): { before?: unknown; after?: unknown } | undefined {
  if (input.before === undefined && input.after === undefined) {
    return undefined;
  }
  return {
    ...(input.before !== undefined ? { before: input.before } : {}),
    ...(input.after !== undefined ? { after: input.after } : {}),
  };
}
