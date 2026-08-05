import { describe, expect, it } from "vitest";
import type { PreviewKoinoxristaResult } from "../settle";
import {
  buildKoinoxristaPdfViewModel,
  formatSharesLabel,
} from "./view-model";

function basePreview(
  overrides: Partial<PreviewKoinoxristaResult> = {},
): PreviewKoinoxristaResult {
  return {
    buildingId: "b1",
    year: 2026,
    month: 8,
    from: "2026-07-31T21:00:00.000Z",
    to: "2026-08-31T20:59:59.999Z",
    heatingAllocation: "FIXED_SHARES",
    existingSettlement: null,
    statement: {
      totalExpenseCents: 84583,
      skippedManualCents: 0,
      skippedUncategorizedCents: 0,
      heatingAllocationMode: "FIXED_SHARES",
      missingHeatingReadingLabels: [],
      lines: [
        {
          apartmentId: "a1",
          apartmentLabel: "Α1",
          categoryId: "c-elev",
          categoryName: "Ανελκυστήρας",
          allocationMethod: "ELEVATOR_SHARES",
          amountCents: 12000,
          shareUsedBps: 4000,
          expenseIds: ["e1"],
        },
        {
          apartmentId: "a2",
          apartmentLabel: "Α2",
          categoryId: "c-elev",
          categoryName: "Ανελκυστήρας",
          allocationMethod: "ELEVATOR_SHARES",
          amountCents: 8000,
          shareUsedBps: 3000,
          expenseIds: ["e1"],
        },
        {
          apartmentId: "a1",
          apartmentLabel: "Α1",
          categoryId: "c-gen",
          categoryName: "Γενικά κοινόχρηστα",
          allocationMethod: "GENERAL_SHARES",
          amountCents: 19908,
          shareUsedBps: 3500,
          expenseIds: ["e2"],
        },
      ],
      apartmentStatements: [
        {
          apartmentId: "a1",
          apartmentLabel: "Α1",
          totalCents: 31908,
          lines: [
            {
              apartmentId: "a1",
              apartmentLabel: "Α1",
              categoryId: "c-elev",
              categoryName: "Ανελκυστήρας",
              allocationMethod: "ELEVATOR_SHARES",
              amountCents: 12000,
              shareUsedBps: 4000,
              expenseIds: ["e1"],
            },
            {
              apartmentId: "a1",
              apartmentLabel: "Α1",
              categoryId: "c-gen",
              categoryName: "Γενικά κοινόχρηστα",
              allocationMethod: "GENERAL_SHARES",
              amountCents: 19908,
              shareUsedBps: 3500,
              expenseIds: ["e2"],
            },
          ],
        },
        {
          apartmentId: "a2",
          apartmentLabel: "Α2",
          totalCents: 8000,
          lines: [
            {
              apartmentId: "a2",
              apartmentLabel: "Α2",
              categoryId: "c-elev",
              categoryName: "Ανελκυστήρας",
              allocationMethod: "ELEVATOR_SHARES",
              amountCents: 8000,
              shareUsedBps: 3000,
              expenseIds: ["e1"],
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe("formatSharesLabel", () => {
  it("converts bps to χιλιοστά", () => {
    expect(formatSharesLabel(2500)).toBe("250‰");
    expect(formatSharesLabel(0)).toBe("0‰");
    expect(formatSharesLabel(10000)).toBe("1000‰");
  });
});

describe("buildKoinoxristaPdfViewModel", () => {
  it("maps totals and draft watermark when not finalized", () => {
    const vm = buildKoinoxristaPdfViewModel({
      building: { name: "Κολωνάκι", address: "Σκουφά 12" },
      preview: basePreview(),
      ownersByApartmentId: { a1: "Μαρία Παπαδοπούλου", a2: null },
      printedAt: new Date("2026-08-05T12:00:00.000Z"),
    });

    expect(vm.isDraft).toBe(true);
    expect(vm.periodLabel).toBe("Αύγουστος 2026");
    expect(vm.buildingName).toBe("Κολωνάκι");
    expect(vm.buildingAddress).toBe("Σκουφά 12");
    expect(vm.allocatableTotalCents).toBe(39908);
    expect(vm.totalExpenseCents).toBe(84583);
    expect(vm.apartments).toHaveLength(2);
    expect(vm.apartments[0]?.ownerName).toBe("Μαρία Παπαδοπούλου");
    expect(vm.apartments[0]?.totalLabel).toContain("319");
    expect(vm.apartments[0]?.lines[0]?.shareLabel).toBe("400‰");
    expect(vm.heatingModeLabel).toBe("Θέρμανση: χιλιοστά");
  });

  it("clears draft when settlement FINALIZED", () => {
    const vm = buildKoinoxristaPdfViewModel({
      building: { name: "Test", address: null },
      preview: basePreview({
        existingSettlement: {
          id: "s1",
          status: "FINALIZED",
          totalCents: 39908,
          finalizedAt: "2026-08-01T10:00:00.000Z",
        },
      }),
      ownersByApartmentId: {},
    });
    expect(vm.isDraft).toBe(false);
  });

  it("aggregates category rows across apartments", () => {
    const vm = buildKoinoxristaPdfViewModel({
      building: { name: "Test", address: null },
      preview: basePreview(),
      ownersByApartmentId: {},
    });
    const elev = vm.categoryRows.find((r) => r.categoryName === "Ανελκυστήρας");
    expect(elev?.amountCents).toBe(20000);
    expect(vm.categoryRows.length).toBe(2);
  });

  it("handles empty apartment statements", () => {
    const vm = buildKoinoxristaPdfViewModel({
      building: { name: "Empty", address: null },
      preview: basePreview({
        statement: {
          totalExpenseCents: 0,
          skippedManualCents: 500,
          skippedUncategorizedCents: 100,
          heatingAllocationMode: "FIXED_SHARES",
          missingHeatingReadingLabels: [],
          lines: [],
          apartmentStatements: [],
        },
      }),
      ownersByApartmentId: {},
    });
    expect(vm.apartments).toEqual([]);
    expect(vm.allocatableTotalCents).toBe(0);
    expect(vm.skippedCents).toBe(600);
    expect(vm.categoryRows).toEqual([]);
  });

  it("labels meter heating mode", () => {
    const vm = buildKoinoxristaPdfViewModel({
      building: { name: "M", address: null },
      preview: basePreview({ heatingAllocation: "METER_READINGS" }),
      ownersByApartmentId: {},
    });
    expect(vm.heatingModeLabel).toBe("Θέρμανση: ενδείξεις");
  });
});
