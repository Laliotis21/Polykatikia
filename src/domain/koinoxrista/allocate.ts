import { assertCents } from "@/domain/money";
import {
  KoinoxristaError,
  MSG_MISSING_HEATING_READINGS,
  MSG_ZERO_WEIGHTS,
} from "./errors";

export type AllocationMethod =
  | "GENERAL_SHARES"
  | "ELEVATOR_SHARES"
  | "HEATING_SHARES"
  | "EQUAL"
  | "MANUAL";

export type ApartmentShares = {
  id: string;
  label: string;
  shareBps: number;
  elevatorShareBps: number;
  heatingShareBps: number;
};

export type ExpenseForAllocation = {
  id: string;
  amountCents: number;
  categoryId: string | null;
  allocationMethod: AllocationMethod;
  categoryName: string | null;
  categoryCode: string | null;
};

export type AllocatedLine = {
  apartmentId: string;
  apartmentLabel: string;
  categoryId: string | null;
  categoryName: string | null;
  allocationMethod: AllocationMethod;
  amountCents: number;
  shareUsedBps: number;
  expenseIds: string[];
};

export type ApartmentStatement = {
  apartmentId: string;
  apartmentLabel: string;
  totalCents: number;
  lines: AllocatedLine[];
};

/** How HEATING_SHARES expenses were weighted for this statement (mirrors Building.heatingAllocation). */
export type HeatingAllocationMode = "FIXED_SHARES" | "METER_READINGS";

export type KoinoxristaStatement = {
  totalExpenseCents: number;
  skippedManualCents: number;
  skippedUncategorizedCents: number;
  apartmentStatements: ApartmentStatement[];
  lines: AllocatedLine[];
  /** FIXED_SHARES = heatingShareBps; METER_READINGS = period consumption weights. */
  heatingAllocationMode: HeatingAllocationMode;
  /**
   * Apartment labels with no meter reading row when meter mode is active
   * (treated as 0 consumption). Empty in FIXED_SHARES.
   */
  missingHeatingReadingLabels: string[];
};

/**
 * Largest-remainder (Hamilton) allocation of `amountCents` by non-negative weights.
 * Guarantees sum(parts) === amountCents when there is at least one positive weight.
 * Deterministic: leftover cents go to highest remainders, ties by index order.
 * Uses integer quotients + remainders (no float division).
 */
export function allocateByWeights(
  amountCents: number,
  weights: number[],
): number[] {
  assertCents(amountCents);
  if (weights.length === 0) {
    throw new Error("weights must not be empty");
  }
  for (const w of weights) {
    if (!Number.isInteger(w) || w < 0) {
      throw new Error("weights must be non-negative integers");
    }
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    if (amountCents === 0) {
      return weights.map(() => 0);
    }
    throw new KoinoxristaError(MSG_ZERO_WEIGHTS, 400);
  }

  const floors = weights.map((w) => Math.floor((amountCents * w) / totalWeight));
  let remainder = amountCents - floors.reduce((a, b) => a + b, 0);

  const order = weights
    .map((w, i) => ({ i, rem: (amountCents * w) % totalWeight }))
    .sort((a, b) => {
      if (b.rem !== a.rem) return b.rem - a.rem;
      return a.i - b.i;
    });

  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    const idx = order[k]!.i;
    result[idx]! += 1;
    remainder -= 1;
  }
  return result;
}

export type SharesForMethodOptions = {
  /**
   * When set (building heatingAllocation = METER_READINGS), HEATING_SHARES uses
   * these integer units. Missing apartment id → 0.
   * Omit / undefined / null → use heatingShareBps (FIXED_SHARES).
   */
  heatingMeterUnitsByApartmentId?: ReadonlyMap<string, number> | null;
};

export function sharesForMethod(
  apt: ApartmentShares,
  method: AllocationMethod,
  apartmentCount: number,
  opts?: SharesForMethodOptions,
): number {
  switch (method) {
    case "GENERAL_SHARES":
      return apt.shareBps;
    case "ELEVATOR_SHARES":
      return apt.elevatorShareBps;
    case "HEATING_SHARES": {
      const meters = opts?.heatingMeterUnitsByApartmentId;
      if (meters) {
        return meters.get(apt.id) ?? 0;
      }
      return apt.heatingShareBps;
    }
    case "EQUAL":
      return apartmentCount > 0 ? 1 : 0;
    case "MANUAL":
      return 0;
    default: {
      const _exhaustive: never = method;
      return _exhaustive;
    }
  }
}

type BucketKey = string;

function bucketKey(categoryId: string | null, method: AllocationMethod): BucketKey {
  return `${categoryId ?? "none"}:${method}`;
}

/**
 * Build a monthly κοινόχρηστα statement from EXPENSE rows + apartment χιλιοστά.
 * MANUAL and uncategorized expenses are skipped (counted in skip totals).
 *
 * Heating allocation is driven by building config (`heatingAllocation`), not by
 * whether readings happen to exist:
 * - FIXED_SHARES → heatingShareBps (meter map ignored).
 * - METER_READINGS → pure consumption units via allocateByWeights
 *   (missing apt → 0). Empty / all-zero weights → MSG_ZERO_WEIGHTS when heating
 *   expense amount > 0.
 */
export function buildKoinoxristaStatement(input: {
  apartments: ApartmentShares[];
  expenses: ExpenseForAllocation[];
  /**
   * Building-level mode. Defaults to FIXED_SHARES when omitted.
   * METER_READINGS activates meter weights even if the map is empty.
   */
  heatingAllocation?: HeatingAllocationMode;
  /** Period meter units; only used when heatingAllocation = METER_READINGS. */
  heatingMeterUnitsByApartmentId?: ReadonlyMap<string, number> | null;
}): KoinoxristaStatement {
  const { apartments, expenses } = input;
  const heatingAllocationMode: HeatingAllocationMode =
    input.heatingAllocation ?? "FIXED_SHARES";
  const meterMap =
    heatingAllocationMode === "METER_READINGS"
      ? (input.heatingMeterUnitsByApartmentId ?? new Map<string, number>())
      : null;
  const missingHeatingReadingLabels =
    meterMap != null
      ? apartments.filter((a) => !meterMap.has(a.id)).map((a) => a.label)
      : [];

  if (apartments.length === 0) {
    return {
      totalExpenseCents: 0,
      skippedManualCents: 0,
      skippedUncategorizedCents: 0,
      apartmentStatements: [],
      lines: [],
      heatingAllocationMode,
      missingHeatingReadingLabels: [],
    };
  }

  let skippedManualCents = 0;
  let skippedUncategorizedCents = 0;
  let totalExpenseCents = 0;
  const shareOpts: SharesForMethodOptions = {
    heatingMeterUnitsByApartmentId: meterMap,
  };

  type Bucket = {
    categoryId: string | null;
    categoryName: string | null;
    allocationMethod: AllocationMethod;
    amountCents: number;
    expenseIds: string[];
  };

  const buckets = new Map<BucketKey, Bucket>();

  for (const expense of expenses) {
    assertCents(expense.amountCents);
    totalExpenseCents += expense.amountCents;

    if (!expense.categoryId) {
      skippedUncategorizedCents += expense.amountCents;
      continue;
    }
    if (expense.allocationMethod === "MANUAL") {
      skippedManualCents += expense.amountCents;
      continue;
    }

    const key = bucketKey(expense.categoryId, expense.allocationMethod);
    const existing = buckets.get(key);
    if (existing) {
      existing.amountCents += expense.amountCents;
      existing.expenseIds.push(expense.id);
    } else {
      buckets.set(key, {
        categoryId: expense.categoryId,
        categoryName: expense.categoryName,
        allocationMethod: expense.allocationMethod,
        amountCents: expense.amountCents,
        expenseIds: [expense.id],
      });
    }
  }

  const lines: AllocatedLine[] = [];

  for (const bucket of buckets.values()) {
    const weights = apartments.map((a) =>
      sharesForMethod(
        a,
        bucket.allocationMethod,
        apartments.length,
        shareOpts,
      ),
    );
    const weightSum = weights.reduce((a, b) => a + b, 0);
    if (
      weightSum === 0 &&
      bucket.amountCents > 0 &&
      bucket.allocationMethod === "HEATING_SHARES" &&
      meterMap != null
    ) {
      throw new KoinoxristaError(MSG_MISSING_HEATING_READINGS, 400);
    }
    const parts = allocateByWeights(bucket.amountCents, weights);

    apartments.forEach((apt, i) => {
      const amountCents = parts[i]!;
      if (amountCents === 0 && weights[i] === 0) {
        // Skip pure zeros for clarity.
        return;
      }
      const shareUsedBps =
        bucket.allocationMethod === "EQUAL"
          ? Math.round(10000 / apartments.length)
          : weightSum > 0
            ? Math.round((weights[i]! * 10000) / weightSum)
            : 0;

      lines.push({
        apartmentId: apt.id,
        apartmentLabel: apt.label,
        categoryId: bucket.categoryId,
        categoryName: bucket.categoryName,
        allocationMethod: bucket.allocationMethod,
        amountCents,
        shareUsedBps,
        expenseIds: bucket.expenseIds,
      });
    });
  }

  const byApartment = new Map<string, ApartmentStatement>();
  for (const apt of apartments) {
    byApartment.set(apt.id, {
      apartmentId: apt.id,
      apartmentLabel: apt.label,
      totalCents: 0,
      lines: [],
    });
  }
  for (const line of lines) {
    const stmt = byApartment.get(line.apartmentId)!;
    stmt.totalCents += line.amountCents;
    stmt.lines.push(line);
  }

  return {
    totalExpenseCents,
    skippedManualCents,
    skippedUncategorizedCents,
    apartmentStatements: apartments.map((a) => byApartment.get(a.id)!),
    lines,
    heatingAllocationMode,
    missingHeatingReadingLabels,
  };
}

const ATHENS_TZ = "Europe/Athens";

/** Offset (ms) such that `utc + offset ≈ wall clock in timeZone`. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

/** Convert a Europe/Athens civil datetime to a UTC `Date`. */
export function athensLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(utcGuess, ATHENS_TZ);
  let corrected = new Date(utcGuess.getTime() - offset);
  const offset2 = getTimeZoneOffsetMs(corrected, ATHENS_TZ);
  if (offset2 !== offset) {
    corrected = new Date(utcGuess.getTime() - offset2);
  }
  return corrected;
}

/**
 * Period bounds for a Greece calendar month (Europe/Athens):
 * inclusive start, exclusive end — `[from, to)`.
 */
export function monthAthensRange(
  year: number,
  month: number,
): { from: Date; to: Date } {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid year/month");
  }
  const from = athensLocalToUtc(year, month, 1, 0, 0, 0);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const to = athensLocalToUtc(nextYear, nextMonth, 1, 0, 0, 0);
  return { from, to };
}

/** @deprecated Prefer {@link monthAthensRange}; kept as alias for callers. */
export const monthUtcRange = monthAthensRange;
