import { PrismaClient, Role } from "@prisma/client";
import { finalizeKoinoxristaSettlement } from "../src/domain/koinoxrista";
import { KoinoxristaError } from "../src/domain/koinoxrista/errors";
import { payCharge } from "../src/domain/payments";

const prisma = new PrismaClient();

const BUILDING_ID = "seed-building-kolonaki";
const DEMO_YEAR = 2026;
const DEMO_MONTH = 8;

/**
 * Wipe period settlement (and linked payments) then finalize fresh.
 * Safe re-run: always converges to same demo charges from current EXPENSE rows.
 */
async function ensureFinalizedPeriod(input: {
  buildingId: string;
  year: number;
  month: number;
  createdById: string;
}): Promise<{ settlementId: string; totalCents: number; chargeCount: number }> {
  const existing = await prisma.commonExpenseSettlement.findUnique({
    where: {
      buildingId_year_month: {
        buildingId: input.buildingId,
        year: input.year,
        month: input.month,
      },
    },
    select: {
      id: true,
      chargeTransactions: { select: { id: true } },
    },
  });

  if (existing) {
    const chargeIds = existing.chargeTransactions.map((c) => c.id);
    if (chargeIds.length > 0) {
      // paysChargeId FK is Restrict — drop INCOME rows before charges/settlement.
      await prisma.transaction.deleteMany({
        where: { paysChargeId: { in: chargeIds } },
      });
    }
    await prisma.commonExpenseSettlement.delete({ where: { id: existing.id } });
  }

  // Orphan CHARGEs from a prior attempt without settlementId.
  const label = `${String(input.month).padStart(2, "0")}/${input.year}`;
  const orphans = await prisma.transaction.findMany({
    where: {
      buildingId: input.buildingId,
      type: "CHARGE",
      description: { startsWith: `Κοινόχρηστα ${label}` },
    },
    select: { id: true },
  });
  if (orphans.length > 0) {
    const orphanIds = orphans.map((o) => o.id);
    await prisma.transaction.deleteMany({
      where: { paysChargeId: { in: orphanIds } },
    });
    await prisma.transaction.deleteMany({ where: { id: { in: orphanIds } } });
  }

  try {
    const result = await finalizeKoinoxristaSettlement(prisma, input);
    return {
      settlementId: result.settlementId,
      totalCents: result.totalCents,
      chargeCount: result.chargeTransactionIds.length,
    };
  } catch (err) {
    if (err instanceof KoinoxristaError) {
      throw new Error(`Finalize ${label} failed: ${err.message}`);
    }
    throw err;
  }
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@polykatoikia.local" },
    update: {},
    create: {
      email: "admin@polykatoikia.local",
      name: "Admin Operator",
      role: Role.ADMIN,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: "operator@polykatoikia.local" },
    update: {},
    create: {
      email: "operator@polykatoikia.local",
      name: "Day Operator",
      role: Role.OPERATOR,
    },
  });

  const building = await prisma.building.upsert({
    where: { id: BUILDING_ID },
    update: {
      name: "Κολωνάκι 12",
      address: "Σκουφά 12, Αθήνα",
    },
    create: {
      id: BUILDING_ID,
      name: "Κολωνάκι 12",
      address: "Σκουφά 12, Αθήνα",
    },
  });

  const apartments = [
    {
      id: "seed-apt-a1",
      label: "Α1",
      shareBps: 2500,
      elevatorShareBps: 1500,
      heatingShareBps: 2500,
      floor: 1,
    },
    {
      id: "seed-apt-a2",
      label: "Α2",
      shareBps: 2500,
      elevatorShareBps: 1500,
      heatingShareBps: 2500,
      floor: 1,
    },
    {
      id: "seed-apt-b1",
      label: "Β1",
      shareBps: 3000,
      elevatorShareBps: 3500,
      heatingShareBps: 3000,
      floor: 2,
    },
    {
      id: "seed-apt-b2",
      label: "Β2",
      shareBps: 2000,
      elevatorShareBps: 3500,
      heatingShareBps: 2000,
      floor: 2,
    },
  ] as const;

  for (const apt of apartments) {
    await prisma.apartment.upsert({
      where: { id: apt.id },
      update: {
        shareBps: apt.shareBps,
        elevatorShareBps: apt.elevatorShareBps,
        heatingShareBps: apt.heatingShareBps,
        floor: apt.floor,
        label: apt.label,
        buildingId: building.id,
      },
      create: {
        id: apt.id,
        buildingId: building.id,
        label: apt.label,
        shareBps: apt.shareBps,
        elevatorShareBps: apt.elevatorShareBps,
        heatingShareBps: apt.heatingShareBps,
        floor: apt.floor,
      },
    });
  }

  const owners = [
    {
      id: "seed-owner-1",
      name: "Μαρία Παπαδοπούλου",
      email: "maria@example.com",
      phone: "+30 210 123 4501",
      apartmentId: "seed-apt-a1",
      portalToken: "demo-portal-maria",
    },
    {
      id: "seed-owner-2",
      name: "Γιάννης Νικολάου",
      email: "giannis@example.com",
      phone: "+30 210 123 4502",
      apartmentId: "seed-apt-a2",
      portalToken: "demo-portal-giannis",
    },
    {
      id: "seed-owner-3",
      name: "Ελένη Κωνσταντίνου",
      email: "eleni@example.com",
      phone: "+30 694 123 4503",
      apartmentId: "seed-apt-b1",
      portalToken: "demo-portal-eleni",
    },
    {
      id: "seed-owner-4",
      name: "Νίκος Δημητρίου",
      email: null,
      phone: "+30 697 123 4504",
      apartmentId: "seed-apt-b2",
      portalToken: "demo-portal-nikos",
    },
  ] as const;

  const fromDate = new Date("2024-01-01T00:00:00.000Z");

  for (const owner of owners) {
    await prisma.owner.upsert({
      where: { id: owner.id },
      update: {
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        portalToken: owner.portalToken,
      },
      create: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        portalToken: owner.portalToken,
      },
    });

    const linkId = `seed-ao-${owner.id}`;
    await prisma.apartmentOwner.upsert({
      where: { id: linkId },
      update: {},
      create: {
        id: linkId,
        apartmentId: owner.apartmentId,
        ownerId: owner.id,
        fromDate,
      },
    });
  }

  const categories = [
    {
      id: "seed-cat-elevator",
      name: "Ανελκυστήρας",
      code: "ELEVATOR",
      allocationMethod: "ELEVATOR_SHARES" as const,
    },
    {
      id: "seed-cat-cleaning",
      name: "Καθαριότητα",
      code: "CLEANING",
      allocationMethod: "GENERAL_SHARES" as const,
    },
    {
      id: "seed-cat-heating",
      name: "Θέρμανση",
      code: "HEATING",
      allocationMethod: "HEATING_SHARES" as const,
    },
    {
      id: "seed-cat-common",
      name: "Γενικά κοινόχρηστα",
      code: "COMMON",
      allocationMethod: "GENERAL_SHARES" as const,
    },
  ] as const;

  for (const cat of categories) {
    await prisma.expenseCategory.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        code: cat.code,
        allocationMethod: cat.allocationMethod,
      },
      create: {
        id: cat.id,
        name: cat.name,
        code: cat.code,
        allocationMethod: cat.allocationMethod,
      },
    });
  }

  // Prior-month HEATING expense (Jan 2026) — finalized below for history.
  const heatingExpense = await prisma.transaction.upsert({
    where: { id: "seed-tx-heating-jan-2026" },
    update: {
      amountCents: 125000,
      description: "Πετρέλαιο θέρμανσης — Ιανουάριος 2026",
      occurredAt: new Date("2026-01-15T10:00:00.000Z"),
      categoryId: "seed-cat-heating",
    },
    create: {
      id: "seed-tx-heating-jan-2026",
      buildingId: building.id,
      categoryId: "seed-cat-heating",
      type: "EXPENSE",
      amountCents: 125000,
      description: "Πετρέλαιο θέρμανσης — Ιανουάριος 2026",
      occurredAt: new Date("2026-01-15T10:00:00.000Z"),
      createdById: admin.id,
    },
  });

  // Current-month demo expenses for Aug 2026 κοινόχρηστα.
  const cleaningAug = await prisma.transaction.upsert({
    where: { id: "seed-tx-cleaning-aug-2026" },
    update: {
      amountCents: 40000,
      description: "Καθαριότητα κοινόχρηστων — Αύγουστος 2026",
      occurredAt: new Date("2026-08-05T09:00:00.000Z"),
      categoryId: "seed-cat-cleaning",
    },
    create: {
      id: "seed-tx-cleaning-aug-2026",
      buildingId: building.id,
      categoryId: "seed-cat-cleaning",
      type: "EXPENSE",
      amountCents: 40000,
      description: "Καθαριότητα κοινόχρηστων — Αύγουστος 2026",
      occurredAt: new Date("2026-08-05T09:00:00.000Z"),
      createdById: admin.id,
    },
  });

  const elevatorAug = await prisma.transaction.upsert({
    where: { id: "seed-tx-elevator-aug-2026" },
    update: {
      amountCents: 18000,
      description: "Συντήρηση ανελκυστήρα — Αύγουστος 2026",
      occurredAt: new Date("2026-08-03T11:00:00.000Z"),
      categoryId: "seed-cat-elevator",
    },
    create: {
      id: "seed-tx-elevator-aug-2026",
      buildingId: building.id,
      categoryId: "seed-cat-elevator",
      type: "EXPENSE",
      amountCents: 18000,
      description: "Συντήρηση ανελκυστήρα — Αύγουστος 2026",
      occurredAt: new Date("2026-08-03T11:00:00.000Z"),
      createdById: admin.id,
    },
  });

  const commonAug = await prisma.transaction.upsert({
    where: { id: "seed-tx-common-aug-2026" },
    update: {
      amountCents: 22000,
      description: "Κοινόχρηστα (ρεύμα / νερό) — Αύγουστος 2026",
      occurredAt: new Date("2026-08-04T14:00:00.000Z"),
      categoryId: "seed-cat-common",
    },
    create: {
      id: "seed-tx-common-aug-2026",
      buildingId: building.id,
      categoryId: "seed-cat-common",
      type: "EXPENSE",
      amountCents: 22000,
      description: "Κοινόχρηστα (ρεύμα / νερό) — Αύγουστος 2026",
      occurredAt: new Date("2026-08-04T14:00:00.000Z"),
      createdById: admin.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "portal@polykatoikia.local" },
    update: {},
    create: {
      email: "portal@polykatoikia.local",
      name: "Portal Demo",
      role: Role.OPERATOR,
    },
  });

  // Pre-finalize so Collections + Portal show charges without operator click.
  const janSettlement = await ensureFinalizedPeriod({
    buildingId: building.id,
    year: 2026,
    month: 1,
    createdById: admin.id,
  });

  const augSettlement = await ensureFinalizedPeriod({
    buildingId: building.id,
    year: DEMO_YEAR,
    month: DEMO_MONTH,
    createdById: admin.id,
  });

  // Mark Α1 (Μαρία) Aug charge as PAID; leave A2/B1/B2 OPEN for Εισπράξεις mix.
  const mariaAugCharge = await prisma.transaction.findFirst({
    where: {
      buildingId: building.id,
      type: "CHARGE",
      apartmentId: "seed-apt-a1",
      settlement: { year: DEMO_YEAR, month: DEMO_MONTH },
    },
    include: { payment: { select: { id: true } } },
  });

  let paidCharge: { chargeId: string; incomeId: string; alreadyPaid: boolean } | null =
    null;
  if (mariaAugCharge) {
    const paid = await payCharge(prisma, {
      chargeId: mariaAugCharge.id,
      createdById: admin.id,
      description: `Πληρωμή (demo seed) · ${mariaAugCharge.description ?? mariaAugCharge.id}`,
      occurredAt: new Date("2026-08-06T10:00:00.000Z"),
    });
    paidCharge = {
      chargeId: paid.chargeId,
      incomeId: paid.incomeId,
      alreadyPaid: paid.alreadyPaid,
    };
  }

  const [aptCount, expenseCount, chargeCount, openCharges, paidCharges, portalOwners] =
    await Promise.all([
      prisma.apartment.count({ where: { buildingId: building.id } }),
      prisma.transaction.count({
        where: { buildingId: building.id, type: "EXPENSE" },
      }),
      prisma.transaction.count({
        where: { buildingId: building.id, type: "CHARGE" },
      }),
      prisma.transaction.count({
        where: {
          buildingId: building.id,
          type: "CHARGE",
          payment: { is: null },
        },
      }),
      prisma.transaction.count({
        where: {
          buildingId: building.id,
          type: "CHARGE",
          payment: { isNot: null },
        },
      }),
      prisma.owner.count({ where: { portalToken: { not: null } } }),
    ]);

  console.log("Seed complete:", {
    admin: admin.email,
    operator: operator.email,
    building: building.name,
    apartments: aptCount,
    owners: owners.length,
    categories: categories.length,
    expenses: expenseCount,
    charges: { total: chargeCount, open: openCharges, paid: paidCharges },
    portalTokens: portalOwners,
    heatingExpense: {
      id: heatingExpense.id,
      amountCents: heatingExpense.amountCents,
      month: "2026-01",
    },
    demoAug2026: {
      cleaning: cleaningAug.id,
      elevator: elevatorAug.id,
      common: commonAug.id,
      totalExpenseCents:
        cleaningAug.amountCents + elevatorAug.amountCents + commonAug.amountCents,
    },
    settlements: {
      jan2026: janSettlement,
      aug2026: augSettlement,
    },
    paidDemo: paidCharge,
    portalDemo: "/portal/demo-portal-maria",
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
