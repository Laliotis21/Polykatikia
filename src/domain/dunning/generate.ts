import type { Prisma, PrismaClient, Transaction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCents } from "@/domain/money";
import { sendEmail } from "@/lib/resend";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export type OverdueCharge = Pick<
  Transaction,
  | "id"
  | "buildingId"
  | "apartmentId"
  | "amountCents"
  | "occurredAt"
  | "description"
>;

/** UTC calendar day key yyyy-mm-dd */
export function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * CHARGE txs whose occurredAt is before `asOf` (treated as due date in v1).
 * Unpaid = no linked payment INCOME (`payment` relation / paysChargeId).
 */
export async function findOverdueCharges(
  db: DbClient = prisma,
  asOf: Date = new Date(),
): Promise<OverdueCharge[]> {
  return db.transaction.findMany({
    where: {
      type: "CHARGE",
      occurredAt: { lt: asOf },
      payment: null,
    },
    select: {
      id: true,
      buildingId: true,
      apartmentId: true,
      amountCents: true,
      occurredAt: true,
      description: true,
    },
    orderBy: { occurredAt: "asc" },
  });
}

export type EnsureDunningNoticeInput = {
  charge: OverdueCharge;
  /** Idempotency day (UTC); default today */
  dayKey?: string;
  ownerId?: string | null;
  ownerEmail?: string | null;
};

export type EnsureDunningNoticeResult = {
  noticeId: string;
  created: boolean;
  alreadySent: boolean;
  idempotencyKey: string;
};

/**
 * Idempotent by charge+day: status embeds `charge:{id}:{day}` marker for lookup,
 * since DunningNotice has no chargeTransactionId column in v1 schema.
 */
export async function ensureDunningNoticeForCharge(
  input: EnsureDunningNoticeInput,
  db: DbClient = prisma,
): Promise<EnsureDunningNoticeResult> {
  const dayKey = input.dayKey ?? utcDayKey();
  const idempotencyKey = `dunning:${input.charge.id}:${dayKey}`;
  const statusMarker = `PENDING:${input.charge.id}:${dayKey}`;
  const sentMarker = `SENT:${input.charge.id}:${dayKey}`;

  const existing = await db.dunningNotice.findFirst({
    where: {
      buildingId: input.charge.buildingId,
      OR: [{ status: statusMarker }, { status: sentMarker }],
    },
  });

  if (existing) {
    return {
      noticeId: existing.id,
      created: false,
      alreadySent: existing.status.startsWith("SENT:"),
      idempotencyKey,
    };
  }

  const amountCents = assertCents(input.charge.amountCents);
  const notice = await db.dunningNotice.create({
    data: {
      buildingId: input.charge.buildingId,
      apartmentId: input.charge.apartmentId,
      ownerId: input.ownerId ?? null,
      amountCents,
      dueDate: input.charge.occurredAt,
      status: statusMarker,
    },
  });

  return {
    noticeId: notice.id,
    created: true,
    alreadySent: false,
    idempotencyKey,
  };
}

export async function markDunningNoticeSent(
  noticeId: string,
  chargeId: string,
  dayKey: string,
  db: DbClient = prisma,
): Promise<void> {
  await db.dunningNotice.update({
    where: { id: noticeId },
    data: {
      status: `SENT:${chargeId}:${dayKey}`,
      sentAt: new Date(),
    },
  });
}

export async function resolveOwnerEmailForApartment(
  apartmentId: string | null | undefined,
  db: DbClient = prisma,
): Promise<{ ownerId: string; email: string } | null> {
  if (!apartmentId) return null;

  const link = await db.apartmentOwner.findFirst({
    where: {
      apartmentId,
      OR: [{ toDate: null }, { toDate: { gt: new Date() } }],
    },
    include: { owner: true },
    orderBy: { fromDate: "desc" },
  });

  if (!link?.owner.email) return null;
  return { ownerId: link.owner.id, email: link.owner.email };
}

export async function sendDunningReminderEmail(opts: {
  to: string;
  amountCents: number;
  dueDate: Date;
  buildingId: string;
}): Promise<{ sent: boolean }> {
  const euros = (opts.amountCents / 100).toFixed(2);
  const result = await sendEmail({
    to: opts.to,
    subject: `Υπενθύμιση οφειλής — ${euros} €`,
    text: [
      `Έχετε εκκρεμή χρέωση ${euros} €`,
      `Ημερομηνία οφειλής: ${opts.dueDate.toISOString().slice(0, 10)}`,
      `Κτίριο: ${opts.buildingId}`,
    ].join("\n"),
  });
  return { sent: result.sent };
}
