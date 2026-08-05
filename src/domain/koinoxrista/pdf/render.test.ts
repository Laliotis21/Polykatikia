import { describe, expect, it } from "vitest";
import type { PreviewKoinoxristaResult } from "../settle";
import { renderKoinoxristaPdf } from "./render";

function basePreview(): PreviewKoinoxristaResult {
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
          amountCents: 31908,
          shareUsedBps: 4000,
          expenseIds: ["e1"],
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
              amountCents: 31908,
              shareUsedBps: 4000,
              expenseIds: ["e1"],
            },
          ],
        },
      ],
    },
  };
}

describe("renderKoinoxristaPdf", () => {
  it("embeds NotoSans (Greek) instead of Helvetica", async () => {
    const buf = await renderKoinoxristaPdf({
      building: { name: "Κολωνάκι", address: "Σκουφά 12" },
      preview: basePreview(),
      ownersByApartmentId: { a1: "Μαρία Παπαδοπούλου" },
      printedAt: new Date("2026-08-05T12:00:00.000Z"),
    });

    const latin1 = buf.toString("latin1");
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(latin1).toContain("NotoSans");
    expect(latin1).not.toMatch(/Helvetica/);
    expect(latin1).toContain("/FontFile");
  }, 15_000);
});
