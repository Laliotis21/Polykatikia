import { describe, expect, it } from "vitest";
import { planRecurringMints } from "./mint";

describe("planRecurringMints", () => {
  it("plans active templates missing for period", () => {
    const plans = planRecurringMints({
      year: 2026,
      month: 3,
      templates: [
        {
          id: "r1",
          buildingId: "b1",
          categoryId: "c1",
          label: "Κηπουρός",
          amountCents: 15000,
          active: true,
        },
      ],
      alreadyMintedRecurringIds: new Set<string>(),
    });
    expect(plans).toEqual([
      {
        recurringExpenseId: "r1",
        buildingId: "b1",
        categoryId: "c1",
        amountCents: 15000,
        description: "Κηπουρός",
        year: 2026,
        month: 3,
      },
    ]);
  });

  it("skips inactive and already minted", () => {
    const plans = planRecurringMints({
      year: 2026,
      month: 3,
      templates: [
        {
          id: "r1",
          buildingId: "b1",
          categoryId: "c1",
          label: "Κηπουρός",
          amountCents: 15000,
          active: false,
        },
        {
          id: "r2",
          buildingId: "b1",
          categoryId: "c1",
          label: "Θυρωρός",
          amountCents: 80000,
          active: true,
        },
      ],
      alreadyMintedRecurringIds: new Set(["r2"]),
    });
    expect(plans).toEqual([]);
  });
});
