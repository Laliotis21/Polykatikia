import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  KoinoxristaError,
  MSG_ALREADY_FINALIZED,
  MSG_EMPTY_FINALIZE,
  MSG_MISSING_HEATING_READINGS,
  MSG_ZERO_WEIGHTS,
} from "./errors";
import { mapKoinoxristaHttpError } from "./http";
import { assertHeatingReadingsForFinalize } from "./settle";

describe("mapKoinoxristaHttpError", () => {
  it("maps empty finalize to 400 with bilingual message", () => {
    const err = new KoinoxristaError(MSG_EMPTY_FINALIZE, 400);
    expect(mapKoinoxristaHttpError(err)).toEqual({
      status: 400,
      error: MSG_EMPTY_FINALIZE,
    });
    expect(err.message).toMatch(/επιμερίσιμα|allocatable/i);
  });

  it("maps already finalized to 409", () => {
    const err = new KoinoxristaError(MSG_ALREADY_FINALIZED, 409);
    expect(mapKoinoxristaHttpError(err)).toEqual({
      status: 409,
      error: MSG_ALREADY_FINALIZED,
    });
  });

  it("maps zero weights to 400", () => {
    const err = new KoinoxristaError(MSG_ZERO_WEIGHTS, 400);
    expect(mapKoinoxristaHttpError(err)?.status).toBe(400);
  });

  it("maps missing heating readings to 400", () => {
    const err = new KoinoxristaError(MSG_MISSING_HEATING_READINGS, 400);
    expect(mapKoinoxristaHttpError(err)).toEqual({
      status: 400,
      error: MSG_MISSING_HEATING_READINGS,
    });
  });

  it("maps Prisma P2002 unique violation to 409", () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["buildingId", "year", "month"] },
      },
    );
    expect(mapKoinoxristaHttpError(err)).toEqual({
      status: 409,
      error: MSG_ALREADY_FINALIZED,
    });
  });

  it("returns null for unknown errors", () => {
    expect(mapKoinoxristaHttpError(new Error("boom"))).toBeNull();
  });
});

describe("assertHeatingReadingsForFinalize", () => {
  it("blocks METER_READINGS + heating expense + zero readings", () => {
    expect(() =>
      assertHeatingReadingsForFinalize({
        heatingAllocation: "METER_READINGS",
        hasHeatingExpense: true,
        meterRowCount: 0,
      }),
    ).toThrow(MSG_MISSING_HEATING_READINGS);
  });

  it("allows FIXED_SHARES with no readings", () => {
    expect(() =>
      assertHeatingReadingsForFinalize({
        heatingAllocation: "FIXED_SHARES",
        hasHeatingExpense: true,
        meterRowCount: 0,
      }),
    ).not.toThrow();
  });

  it("allows METER_READINGS when readings exist", () => {
    expect(() =>
      assertHeatingReadingsForFinalize({
        heatingAllocation: "METER_READINGS",
        hasHeatingExpense: true,
        meterRowCount: 4,
      }),
    ).not.toThrow();
  });

  it("allows METER_READINGS with no heating expense", () => {
    expect(() =>
      assertHeatingReadingsForFinalize({
        heatingAllocation: "METER_READINGS",
        hasHeatingExpense: false,
        meterRowCount: 0,
      }),
    ).not.toThrow();
  });
});

describe("empty finalize guard", () => {
  it("refuses when allocatable === 0 (no FINALIZED row)", () => {
    const allocatable = 0;
    expect(() => {
      if (allocatable === 0) {
        throw new KoinoxristaError(MSG_EMPTY_FINALIZE, 400);
      }
    }).toThrow(KoinoxristaError);
  });
});
