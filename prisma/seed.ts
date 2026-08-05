import { PrismaClient, Role } from "@prisma/client";
import { finalizeKoinoxristaSettlement } from "../src/domain/koinoxrista";
import { KoinoxristaError } from "../src/domain/koinoxrista/errors";
import { payCharge } from "../src/domain/payments";

const prisma = new PrismaClient();

const DEMO_YEAR = 2026;
/** Primary demo month — Α1 paid here for Εισπράξεις / portal script. */
const DEMO_MONTH = 8;

const MONTH_NAMES_EL = [
  "",
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
] as const;

/** Heating months (Nov–Mar). */
function isHeatingMonth(month: number): boolean {
  return month >= 11 || month <= 3;
}

type AptSpec = {
  id: string;
  label: string;
  shareBps: number;
  elevatorShareBps: number;
  heatingShareBps: number;
  floor: number;
};

type OwnerSpec = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  apartmentId: string;
  portalToken: string | null;
};

type BuildingSpec = {
  id: string;
  name: string;
  address: string;
  apartments: AptSpec[];
  owners: OwnerSpec[];
  /** Slight per-building amount offset so totals differ in UI. */
  amountOffsetCents: number;
};

const KOLONAKI: BuildingSpec = {
  id: "seed-building-kolonaki",
  name: "Κολωνάκι 12",
  address: "Σκουφά 12, Αθήνα",
  amountOffsetCents: 0,
  apartments: [
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
  ],
  owners: [
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
  ],
};

const EXTRA_BUILDINGS: BuildingSpec[] = [
  {
    id: "seed-building-pangrati",
    name: "Παγκράτι 8",
    address: "Υμηττού 8, Αθήνα",
    amountOffsetCents: 2500,
    apartments: [
      {
        id: "seed-pangrati-a1",
        label: "Α1",
        shareBps: 4000,
        elevatorShareBps: 3000,
        heatingShareBps: 4000,
        floor: 1,
      },
      {
        id: "seed-pangrati-a2",
        label: "Α2",
        shareBps: 3500,
        elevatorShareBps: 3500,
        heatingShareBps: 3500,
        floor: 1,
      },
      {
        id: "seed-pangrati-b1",
        label: "Β1",
        shareBps: 2500,
        elevatorShareBps: 3500,
        heatingShareBps: 2500,
        floor: 2,
      },
    ],
    owners: [
      {
        id: "seed-owner-pangrati-1",
        name: "Άννα Βασιλείου",
        email: "anna.v@example.com",
        phone: "+30 210 200 1101",
        apartmentId: "seed-pangrati-a1",
        portalToken: "demo-portal-anna",
      },
      {
        id: "seed-owner-pangrati-2",
        name: "Πέτρος Ιωάννου",
        email: "petros.i@example.com",
        phone: "+30 210 200 1102",
        apartmentId: "seed-pangrati-a2",
        portalToken: null,
      },
      {
        id: "seed-owner-pangrati-3",
        name: "Σοφία Μαρκάτου",
        email: "sofia.m@example.com",
        phone: "+30 694 200 1103",
        apartmentId: "seed-pangrati-b1",
        portalToken: null,
      },
    ],
  },
  {
    id: "seed-building-kypseli",
    name: "Κυψέλη 22",
    address: "Πατησίων 22, Αθήνα",
    amountOffsetCents: 1800,
    apartments: [
      {
        id: "seed-kypseli-a1",
        label: "Α1",
        shareBps: 2200,
        elevatorShareBps: 2000,
        heatingShareBps: 2200,
        floor: 1,
      },
      {
        id: "seed-kypseli-a2",
        label: "Α2",
        shareBps: 2300,
        elevatorShareBps: 2000,
        heatingShareBps: 2300,
        floor: 1,
      },
      {
        id: "seed-kypseli-b1",
        label: "Β1",
        shareBps: 2800,
        elevatorShareBps: 3000,
        heatingShareBps: 2800,
        floor: 2,
      },
      {
        id: "seed-kypseli-b2",
        label: "Β2",
        shareBps: 2700,
        elevatorShareBps: 3000,
        heatingShareBps: 2700,
        floor: 2,
      },
    ],
    owners: [
      {
        id: "seed-owner-kypseli-1",
        name: "Δήμητρα Σταύρου",
        email: "dimitra.s@example.com",
        phone: "+30 210 300 2201",
        apartmentId: "seed-kypseli-a1",
        portalToken: null,
      },
      {
        id: "seed-owner-kypseli-2",
        name: "Κώστας Αλεξίου",
        email: "kostas.a@example.com",
        phone: "+30 210 300 2202",
        apartmentId: "seed-kypseli-a2",
        portalToken: null,
      },
      {
        id: "seed-owner-kypseli-3",
        name: "Ιωάννα Ρήγα",
        email: "ioanna.r@example.com",
        phone: "+30 697 300 2203",
        apartmentId: "seed-kypseli-b1",
        portalToken: null,
      },
      {
        id: "seed-owner-kypseli-4",
        name: "Θανάσης Λάιος",
        email: null,
        phone: "+30 698 300 2204",
        apartmentId: "seed-kypseli-b2",
        portalToken: null,
      },
    ],
  },
  {
    id: "seed-building-glyfada",
    name: "Γλυφάδα 5",
    address: "Γρ. Λαμπράκη 5, Γλυφάδα",
    amountOffsetCents: 4200,
    apartments: [
      {
        id: "seed-glyfada-a1",
        label: "Α1",
        shareBps: 1800,
        elevatorShareBps: 1500,
        heatingShareBps: 1800,
        floor: 1,
      },
      {
        id: "seed-glyfada-a2",
        label: "Α2",
        shareBps: 2000,
        elevatorShareBps: 1500,
        heatingShareBps: 2000,
        floor: 1,
      },
      {
        id: "seed-glyfada-b1",
        label: "Β1",
        shareBps: 2200,
        elevatorShareBps: 2500,
        heatingShareBps: 2200,
        floor: 2,
      },
      {
        id: "seed-glyfada-b2",
        label: "Β2",
        shareBps: 2000,
        elevatorShareBps: 2500,
        heatingShareBps: 2000,
        floor: 2,
      },
      {
        id: "seed-glyfada-g1",
        label: "Γ1",
        shareBps: 2000,
        elevatorShareBps: 2000,
        heatingShareBps: 2000,
        floor: 3,
      },
    ],
    owners: [
      {
        id: "seed-owner-glyfada-1",
        name: "Χρήστος Παππάς",
        email: "christos.p@example.com",
        phone: "+30 210 400 3301",
        apartmentId: "seed-glyfada-a1",
        portalToken: null,
      },
      {
        id: "seed-owner-glyfada-2",
        name: "Μαρίνα Κολιά",
        email: "marina.k@example.com",
        phone: "+30 210 400 3302",
        apartmentId: "seed-glyfada-a2",
        portalToken: null,
      },
      {
        id: "seed-owner-glyfada-3",
        name: "Αλέξης Ντούνης",
        email: "alex.n@example.com",
        phone: "+30 694 400 3303",
        apartmentId: "seed-glyfada-b1",
        portalToken: null,
      },
      {
        id: "seed-owner-glyfada-4",
        name: "Βίκυ Σαμαρά",
        email: "viky.s@example.com",
        phone: "+30 697 400 3304",
        apartmentId: "seed-glyfada-b2",
        portalToken: null,
      },
      {
        id: "seed-owner-glyfada-5",
        name: "Γιώργος Φωτίου",
        email: null,
        phone: "+30 698 400 3305",
        apartmentId: "seed-glyfada-g1",
        portalToken: null,
      },
    ],
  },
  {
    id: "seed-building-thessaloniki",
    name: "Θεσσαλονίκη — Τσιμισκή 40",
    address: "Τσιμισκή 40, Θεσσαλονίκη",
    amountOffsetCents: 3100,
    apartments: [
      {
        id: "seed-thess-a1",
        label: "Α1",
        shareBps: 3334,
        elevatorShareBps: 3333,
        heatingShareBps: 3334,
        floor: 1,
      },
      {
        id: "seed-thess-a2",
        label: "Α2",
        shareBps: 3333,
        elevatorShareBps: 3333,
        heatingShareBps: 3333,
        floor: 1,
      },
      {
        id: "seed-thess-b1",
        label: "Β1",
        shareBps: 3333,
        elevatorShareBps: 3334,
        heatingShareBps: 3333,
        floor: 2,
      },
    ],
    owners: [
      {
        id: "seed-owner-thess-1",
        name: "Ευαγγελία Μήτσου",
        email: "eva.m@example.com",
        phone: "+30 2310 500 4401",
        apartmentId: "seed-thess-a1",
        portalToken: null,
      },
      {
        id: "seed-owner-thess-2",
        name: "Μιχάλης Καραγιάννης",
        email: "michalis.k@example.com",
        phone: "+30 2310 500 4402",
        apartmentId: "seed-thess-a2",
        portalToken: null,
      },
      {
        id: "seed-owner-thess-3",
        name: "Όλγα Πετρίδου",
        email: "olga.p@example.com",
        phone: "+30 694 500 4403",
        apartmentId: "seed-thess-b1",
        portalToken: null,
      },
    ],
  },
  {
    id: "seed-building-patra",
    name: "Πάτρα — Ρήγα Φεραίου 15",
    address: "Ρήγα Φεραίου 15, Πάτρα",
    amountOffsetCents: 1500,
    apartments: [
      {
        id: "seed-patra-a1",
        label: "Α1",
        shareBps: 2500,
        elevatorShareBps: 2500,
        heatingShareBps: 2500,
        floor: 1,
      },
      {
        id: "seed-patra-a2",
        label: "Α2",
        shareBps: 2500,
        elevatorShareBps: 2500,
        heatingShareBps: 2500,
        floor: 1,
      },
      {
        id: "seed-patra-b1",
        label: "Β1",
        shareBps: 2500,
        elevatorShareBps: 2500,
        heatingShareBps: 2500,
        floor: 2,
      },
      {
        id: "seed-patra-b2",
        label: "Β2",
        shareBps: 2500,
        elevatorShareBps: 2500,
        heatingShareBps: 2500,
        floor: 2,
      },
    ],
    owners: [
      {
        id: "seed-owner-patra-1",
        name: "Λεωνίδας Κρήτης",
        email: "leonidas.k@example.com",
        phone: "+30 2610 600 5501",
        apartmentId: "seed-patra-a1",
        portalToken: null,
      },
      {
        id: "seed-owner-patra-2",
        name: "Κατερίνα Ζώη",
        email: "katerina.z@example.com",
        phone: "+30 2610 600 5502",
        apartmentId: "seed-patra-a2",
        portalToken: null,
      },
      {
        id: "seed-owner-patra-3",
        name: "Στέλιος Αντωνίου",
        email: "stelios.a@example.com",
        phone: "+30 697 600 5503",
        apartmentId: "seed-patra-b1",
        portalToken: null,
      },
      {
        id: "seed-owner-patra-4",
        name: "Νατάσα Βλάχου",
        email: null,
        phone: "+30 698 600 5504",
        apartmentId: "seed-patra-b2",
        portalToken: null,
      },
    ],
  },
];

const ALL_BUILDINGS = [KOLONAKI, ...EXTRA_BUILDINGS];

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
      throw new Error(`Finalize ${label} (${input.buildingId}) failed: ${err.message}`);
    }
    throw err;
  }
}

function monthSlug(month: number): string {
  return String(month).padStart(2, "0");
}

function expenseAmounts(
  month: number,
  offsetCents: number,
): {
  cleaning: number;
  elevator: number;
  common: number;
  heating: number | null;
} {
  // Keep Kolonaki Aug + Jan heating identical to prior demo numbers.
  const cleaning = 38000 + month * 250 + offsetCents;
  const elevator = 15000 + month * 375 + Math.floor(offsetCents / 2);
  const common = 20000 + month * 250 + Math.floor(offsetCents / 3);
  const heating = isHeatingMonth(month)
    ? 100000 + month * 4000 + offsetCents * 2
    : null;

  return { cleaning, elevator, common, heating };
}

/** Override amounts for Kolonaki months that demo script / docs reference. */
function kolonakiAmountOverrides(
  month: number,
): Partial<ReturnType<typeof expenseAmounts>> | null {
  if (month === 1) {
    return { heating: 125000 };
  }
  if (month === 8) {
    return { cleaning: 40000, elevator: 18000, common: 22000 };
  }
  return null;
}

async function upsertExpense(input: {
  id: string;
  buildingId: string;
  categoryId: string;
  amountCents: number;
  description: string;
  occurredAt: Date;
  createdById: string;
}) {
  return prisma.transaction.upsert({
    where: { id: input.id },
    update: {
      amountCents: input.amountCents,
      description: input.description,
      occurredAt: input.occurredAt,
      categoryId: input.categoryId,
    },
    create: {
      id: input.id,
      buildingId: input.buildingId,
      categoryId: input.categoryId,
      type: "EXPENSE",
      amountCents: input.amountCents,
      description: input.description,
      occurredAt: input.occurredAt,
      createdById: input.createdById,
    },
  });
}

async function seedBuildingStructure(
  building: BuildingSpec,
  fromDate: Date,
): Promise<void> {
  await prisma.building.upsert({
    where: { id: building.id },
    update: {
      name: building.name,
      address: building.address,
    },
    create: {
      id: building.id,
      name: building.name,
      address: building.address,
    },
  });

  for (const apt of building.apartments) {
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

  for (const owner of building.owners) {
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
}

async function seedBuildingYear(
  building: BuildingSpec,
  createdById: string,
): Promise<{ monthsFinalized: number }> {
  const shortId = building.id.replace(/^seed-building-/, "");
  let monthsFinalized = 0;

  for (let month = 1; month <= 12; month++) {
    const monthName = MONTH_NAMES_EL[month];
    const slug = monthSlug(month);
    let amounts = expenseAmounts(month, building.amountOffsetCents);
    if (building.id === KOLONAKI.id) {
      const overrides = kolonakiAmountOverrides(month);
      if (overrides) amounts = { ...amounts, ...overrides };
    }

    // Keep legacy Kolonaki tx ids for Jan heating + Aug trio (idempotent re-seed).
    const cleaningId =
      building.id === KOLONAKI.id && month === 8
        ? "seed-tx-cleaning-aug-2026"
        : `seed-tx-${shortId}-cleaning-${slug}-${DEMO_YEAR}`;
    const elevatorId =
      building.id === KOLONAKI.id && month === 8
        ? "seed-tx-elevator-aug-2026"
        : `seed-tx-${shortId}-elevator-${slug}-${DEMO_YEAR}`;
    const commonId =
      building.id === KOLONAKI.id && month === 8
        ? "seed-tx-common-aug-2026"
        : `seed-tx-${shortId}-common-${slug}-${DEMO_YEAR}`;
    const heatingId =
      building.id === KOLONAKI.id && month === 1
        ? "seed-tx-heating-jan-2026"
        : `seed-tx-${shortId}-heating-${slug}-${DEMO_YEAR}`;

    await upsertExpense({
      id: cleaningId,
      buildingId: building.id,
      categoryId: "seed-cat-cleaning",
      amountCents: amounts.cleaning,
      description: `Καθαριότητα κοινόχρηστων — ${monthName} ${DEMO_YEAR}`,
      occurredAt: new Date(
        `${DEMO_YEAR}-${slug}-05T09:00:00.000Z`,
      ),
      createdById,
    });

    await upsertExpense({
      id: elevatorId,
      buildingId: building.id,
      categoryId: "seed-cat-elevator",
      amountCents: amounts.elevator,
      description: `Συντήρηση ανελκυστήρα — ${monthName} ${DEMO_YEAR}`,
      occurredAt: new Date(
        `${DEMO_YEAR}-${slug}-03T11:00:00.000Z`,
      ),
      createdById,
    });

    await upsertExpense({
      id: commonId,
      buildingId: building.id,
      categoryId: "seed-cat-common",
      amountCents: amounts.common,
      description: `Κοινόχρηστα (ρεύμα / νερό) — ${monthName} ${DEMO_YEAR}`,
      occurredAt: new Date(
        `${DEMO_YEAR}-${slug}-04T14:00:00.000Z`,
      ),
      createdById,
    });

    if (amounts.heating != null) {
      await upsertExpense({
        id: heatingId,
        buildingId: building.id,
        categoryId: "seed-cat-heating",
        amountCents: amounts.heating,
        description: `Πετρέλαιο θέρμανσης — ${monthName} ${DEMO_YEAR}`,
        occurredAt: new Date(
          `${DEMO_YEAR}-${slug}-15T10:00:00.000Z`,
        ),
        createdById,
      });
    }

    // Kolonaki Jan: varied meter readings so heating allocates by consumption.
    if (building.id === KOLONAKI.id && month === 1) {
      const janReadings: Array<{ apartmentId: string; units: number }> = [
        { apartmentId: "seed-apt-a1", units: 5 },
        { apartmentId: "seed-apt-a2", units: 20 },
        { apartmentId: "seed-apt-b1", units: 50 },
        { apartmentId: "seed-apt-b2", units: 10 },
      ];
      for (const row of janReadings) {
        await prisma.heatingMeterReading.upsert({
          where: {
            apartmentId_year_month: {
              apartmentId: row.apartmentId,
              year: DEMO_YEAR,
              month: 1,
            },
          },
          update: { units: row.units, buildingId: building.id },
          create: {
            id: `seed-heat-read-${row.apartmentId}-2026-01`,
            buildingId: building.id,
            apartmentId: row.apartmentId,
            year: DEMO_YEAR,
            month: 1,
            units: row.units,
          },
        });
      }
    }

    await ensureFinalizedPeriod({
      buildingId: building.id,
      year: DEMO_YEAR,
      month,
      createdById,
    });
    monthsFinalized += 1;
  }

  return { monthsFinalized };
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

  await prisma.user.upsert({
    where: { email: "portal@polykatoikia.local" },
    update: {},
    create: {
      email: "portal@polykatoikia.local",
      name: "Portal Demo",
      role: Role.OPERATOR,
    },
  });

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

  const fromDate = new Date("2024-01-01T00:00:00.000Z");
  const buildingSummaries: Array<{
    id: string;
    name: string;
    apartments: number;
    monthsFinalized: number;
  }> = [];

  for (const building of ALL_BUILDINGS) {
    await seedBuildingStructure(building, fromDate);
    const { monthsFinalized } = await seedBuildingYear(building, admin.id);
    buildingSummaries.push({
      id: building.id,
      name: building.name,
      apartments: building.apartments.length,
      monthsFinalized,
    });
  }

  // Mark Α1 (Μαρία) Aug charge as PAID; leave A2/B1/B2 OPEN for Εισπράξεις mix.
  const mariaAugCharge = await prisma.transaction.findFirst({
    where: {
      buildingId: KOLONAKI.id,
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

  const [buildingCount, aptCount, expenseCount, chargeCount, openCharges, paidCharges, portalOwners] =
    await Promise.all([
      prisma.building.count(),
      prisma.apartment.count(),
      prisma.transaction.count({ where: { type: "EXPENSE" } }),
      prisma.transaction.count({ where: { type: "CHARGE" } }),
      prisma.transaction.count({
        where: { type: "CHARGE", payment: { is: null } },
      }),
      prisma.transaction.count({
        where: { type: "CHARGE", payment: { isNot: null } },
      }),
      prisma.owner.count({ where: { portalToken: { not: null } } }),
    ]);

  console.log("Seed complete:", {
    admin: admin.email,
    operator: operator.email,
    year: DEMO_YEAR,
    buildings: buildingCount,
    apartments: aptCount,
    categories: categories.length,
    expenses: expenseCount,
    charges: { total: chargeCount, open: openCharges, paid: paidCharges },
    portalTokens: portalOwners,
    perBuilding: buildingSummaries,
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
