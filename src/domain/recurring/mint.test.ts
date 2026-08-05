import { beforeEach, describe, expect, it, vi } from "vitest";
import { planRecurringMints, mintRecurringExpensesForPeriod } from "./mint";

vi.mock("@/domain/transactions", () => ({
  createTransactionWithIntegrity: vi.fn(),
}));

import { createTransactionWithIntegrity } from "@/domain/transactions";

const createTx = vi.mocked(createTransactionWithIntegrity);

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

describe("mintRecurringExpensesForPeriod alert aggregation", () => {
  beforeEach(() => {
    createTx.mockReset();
  });

  it("aggregates alerts and sets notifiedAfterCommit false when nested", async () => {
    const db = {
      recurringExpense: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "r1",
            buildingId: "b1",
            categoryId: "c1",
            label: "Κηπουρός",
            amountCents: 15000,
            active: true,
            dayOfMonth: 1,
          },
        ]),
      },
      transaction: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    createTx.mockResolvedValue({
      transaction: { id: "tx1" } as never,
      alerts: [{ id: "alert-1", type: "ANOMALY", severity: "HIGH" }],
      anomalyFired: true,
      mismatchOverride: false,
      notifiedAfterCommit: false,
    });

    const result = await mintRecurringExpensesForPeriod(db as never, {
      buildingId: "b1",
      year: 2026,
      month: 3,
      createdById: "user-1",
    });

    expect(result.mintedIds).toEqual(["tx1"]);
    expect(result.alerts).toEqual([
      { id: "alert-1", type: "ANOMALY", severity: "HIGH" },
    ]);
    expect(result.notifiedAfterCommit).toBe(false);
  });

  it("keeps notifiedAfterCommit true when create owns commit", async () => {
    const db = {
      recurringExpense: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "r1",
            buildingId: "b1",
            categoryId: "c1",
            label: "Κηπουρός",
            amountCents: 15000,
            active: true,
            dayOfMonth: 1,
          },
        ]),
      },
      transaction: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    createTx.mockResolvedValue({
      transaction: { id: "tx1" } as never,
      alerts: [{ id: "alert-1", type: "ANOMALY", severity: "HIGH" }],
      anomalyFired: true,
      mismatchOverride: false,
      notifiedAfterCommit: true,
    });

    const result = await mintRecurringExpensesForPeriod(db as never, {
      buildingId: "b1",
      year: 2026,
      month: 3,
      createdById: "user-1",
    });

    expect(result.notifiedAfterCommit).toBe(true);
    expect(result.alerts).toHaveLength(1);
  });
});
