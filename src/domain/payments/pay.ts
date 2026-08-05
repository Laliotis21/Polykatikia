import type { Prisma, PrismaClient, Transaction } from "@prisma/client";
import { assertCents } from "@/domain/money";
import { appendAuditLog } from "@/domain/audit";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export class PaymentError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PaymentError";
    this.status = status;
  }
}

export type PayChargeResult = {
  incomeId: string;
  chargeId: string;
  amountCents: number;
  alreadyPaid: boolean;
};

/**
 * Settle a CHARGE with a linked INCOME (demo pay or future PSP webhook).
 * Idempotent: if CHARGE already has `payment`, returns existing income.
 */
export async function payCharge(
  db: PrismaClient,
  input: {
    chargeId: string;
    createdById: string;
    /** Optional note; default marks demo payment. */
    description?: string;
    occurredAt?: Date;
  },
): Promise<PayChargeResult> {
  return db.$transaction(async (tx) => {
    const charge = await tx.transaction.findUnique({
      where: { id: input.chargeId },
      include: { payment: { select: { id: true, amountCents: true } } },
    });

    if (!charge) {
      throw new PaymentError(404, "Charge not found");
    }
    if (charge.type !== "CHARGE") {
      throw new PaymentError(400, "Transaction is not a CHARGE");
    }

    if (charge.payment) {
      return {
        incomeId: charge.payment.id,
        chargeId: charge.id,
        amountCents: charge.payment.amountCents,
        alreadyPaid: true,
      };
    }

    const amountCents = assertCents(charge.amountCents);
    const income = await tx.transaction.create({
      data: {
        buildingId: charge.buildingId,
        apartmentId: charge.apartmentId,
        settlementId: charge.settlementId,
        type: "INCOME",
        amountCents,
        description:
          input.description ??
          `Πληρωμή (demo) · ${charge.description ?? charge.id}`,
        occurredAt: input.occurredAt ?? new Date(),
        paysChargeId: charge.id,
        createdById: input.createdById,
      },
    });

    await appendAuditLog(
      {
        actorId: input.createdById,
        action: "CHARGE_PAID",
        entityType: "Transaction",
        entityId: charge.id,
        after: {
          incomeId: income.id,
          amountCents,
          paysChargeId: charge.id,
        },
      },
      tx,
    );

    return {
      incomeId: income.id,
      chargeId: charge.id,
      amountCents,
      alreadyPaid: false,
    };
  });
}

/** True when CHARGE has a linked payment income. */
export function isChargePaid(
  charge: Pick<Transaction, "id"> & { payment?: { id: string } | null },
): boolean {
  return Boolean(charge.payment);
}

export type CollectionRow = {
  chargeId: string;
  apartmentId: string | null;
  apartmentLabel: string | null;
  amountCents: number;
  description: string | null;
  occurredAt: string;
  status: "PAID" | "OPEN";
  incomeId: string | null;
  paidAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
};

/**
 * Per-apartment charge status for a finalized settlement period (or all open charges).
 */
export async function listCollectionsForBuilding(
  db: DbClient,
  input: {
    buildingId: string;
    year?: number;
    month?: number;
  },
): Promise<{
  buildingId: string;
  year: number | null;
  month: number | null;
  settlementId: string | null;
  rows: CollectionRow[];
  totals: { openCents: number; paidCents: number; chargeCount: number };
}> {
  let settlementId: string | null = null;
  let year: number | null = input.year ?? null;
  let month: number | null = input.month ?? null;

  if (input.year != null && input.month != null) {
    const settlement = await db.commonExpenseSettlement.findUnique({
      where: {
        buildingId_year_month: {
          buildingId: input.buildingId,
          year: input.year,
          month: input.month,
        },
      },
      select: { id: true, status: true },
    });
    if (settlement?.status === "FINALIZED") {
      settlementId = settlement.id;
    } else {
      return {
        buildingId: input.buildingId,
        year,
        month,
        settlementId: null,
        rows: [],
        totals: { openCents: 0, paidCents: 0, chargeCount: 0 },
      };
    }
  }

  const charges = await db.transaction.findMany({
    where: {
      buildingId: input.buildingId,
      type: "CHARGE",
      ...(settlementId ? { settlementId } : {}),
    },
    include: {
      payment: { select: { id: true, occurredAt: true } },
      apartment: {
        select: {
          id: true,
          label: true,
          owners: {
            where: {
              OR: [{ toDate: null }, { toDate: { gt: new Date() } }],
            },
            take: 1,
            orderBy: { fromDate: "desc" },
            include: {
              owner: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
  });

  const rows: CollectionRow[] = charges.map((c) => {
    const ownerLink = c.apartment?.owners[0];
    const paid = Boolean(c.payment);
    return {
      chargeId: c.id,
      apartmentId: c.apartmentId,
      apartmentLabel: c.apartment?.label ?? null,
      amountCents: c.amountCents,
      description: c.description,
      occurredAt: c.occurredAt.toISOString(),
      status: paid ? "PAID" : "OPEN",
      incomeId: c.payment?.id ?? null,
      paidAt: c.payment?.occurredAt.toISOString() ?? null,
      ownerName: ownerLink?.owner.name ?? null,
      ownerEmail: ownerLink?.owner.email ?? null,
    };
  });

  let openCents = 0;
  let paidCents = 0;
  for (const r of rows) {
    if (r.status === "PAID") paidCents += r.amountCents;
    else openCents += r.amountCents;
  }

  return {
    buildingId: input.buildingId,
    year,
    month,
    settlementId,
    rows,
    totals: {
      openCents,
      paidCents,
      chargeCount: rows.length,
    },
  };
}

export type OwnerChargeRow = {
  chargeId: string;
  buildingId: string;
  buildingName: string;
  apartmentId: string;
  apartmentLabel: string;
  amountCents: number;
  description: string | null;
  occurredAt: string;
  status: "PAID" | "OPEN";
  paidAt: string | null;
  lines: Array<{
    categoryName: string | null;
    amountCents: number;
  }>;
};

/** Open + paid charges for apartments linked to this owner (via portal token). */
export async function listChargesForPortalToken(
  db: DbClient,
  portalToken: string,
): Promise<{
  owner: { id: string; name: string; email: string | null };
  charges: OwnerChargeRow[];
} | null> {
  const owner = await db.owner.findUnique({
    where: { portalToken },
    select: { id: true, name: true, email: true },
  });
  if (!owner) return null;

  const links = await db.apartmentOwner.findMany({
    where: {
      ownerId: owner.id,
      OR: [{ toDate: null }, { toDate: { gt: new Date() } }],
    },
    select: { apartmentId: true },
  });
  const apartmentIds = links.map((l) => l.apartmentId);
  if (apartmentIds.length === 0) {
    return { owner, charges: [] };
  }

  const charges = await db.transaction.findMany({
    where: {
      type: "CHARGE",
      apartmentId: { in: apartmentIds },
    },
    include: {
      payment: { select: { id: true, occurredAt: true } },
      building: { select: { id: true, name: true } },
      apartment: { select: { id: true, label: true } },
      settlement: {
        include: {
          lines: {
            where: { apartmentId: { in: apartmentIds } },
            include: {
              category: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { occurredAt: "desc" },
  });

  return {
    owner,
    charges: charges.map((c) => {
      const aptId = c.apartmentId!;
      const lines =
        c.settlement?.lines
          .filter((l) => l.apartmentId === aptId)
          .map((l) => ({
            categoryName: l.category?.name ?? null,
            amountCents: l.amountCents,
          })) ?? [];
      return {
        chargeId: c.id,
        buildingId: c.buildingId,
        buildingName: c.building.name,
        apartmentId: aptId,
        apartmentLabel: c.apartment?.label ?? "—",
        amountCents: c.amountCents,
        description: c.description,
        occurredAt: c.occurredAt.toISOString(),
        status: c.payment ? ("PAID" as const) : ("OPEN" as const),
        paidAt: c.payment?.occurredAt.toISOString() ?? null,
        lines,
      };
    }),
  };
}

/** Owner may pay this charge iff they currently own the apartment. */
export async function assertOwnerCanPayCharge(
  db: DbClient,
  input: { portalToken: string; chargeId: string },
): Promise<{ ownerId: string; charge: Transaction }> {
  const owner = await db.owner.findUnique({
    where: { portalToken: input.portalToken },
    select: { id: true },
  });
  if (!owner) {
    throw new PaymentError(401, "Invalid portal token");
  }

  const charge = await db.transaction.findUnique({
    where: { id: input.chargeId },
  });
  if (!charge || charge.type !== "CHARGE" || !charge.apartmentId) {
    throw new PaymentError(404, "Charge not found");
  }

  const link = await db.apartmentOwner.findFirst({
    where: {
      ownerId: owner.id,
      apartmentId: charge.apartmentId,
      OR: [{ toDate: null }, { toDate: { gt: new Date() } }],
    },
  });
  if (!link) {
    throw new PaymentError(403, "Forbidden");
  }

  return { ownerId: owner.id, charge };
}
