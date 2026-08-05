import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

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
    where: { id: "seed-building-kolonaki" },
    update: {},
    create: {
      id: "seed-building-kolonaki",
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
    },
    {
      id: "seed-owner-2",
      name: "Γιάννης Νικολάου",
      email: "giannis@example.com",
      phone: "+30 210 123 4502",
      apartmentId: "seed-apt-a2",
    },
    {
      id: "seed-owner-3",
      name: "Ελένη Κωνσταντίνου",
      email: "eleni@example.com",
      phone: "+30 694 123 4503",
      apartmentId: "seed-apt-b1",
    },
    {
      id: "seed-owner-4",
      name: "Νίκος Δημητρίου",
      email: null,
      phone: "+30 697 123 4504",
      apartmentId: "seed-apt-b2",
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
      },
      create: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
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

  // Winter HEATING demo expense — allocated via static heatingShareBps (not meters).
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

  console.log("Seed complete:", {
    admin: admin.email,
    operator: operator.email,
    building: building.name,
    apartments: apartments.length,
    owners: owners.length,
    categories: categories.length,
    heatingExpense: {
      id: heatingExpense.id,
      amountCents: heatingExpense.amountCents,
      month: "2026-01",
    },
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
