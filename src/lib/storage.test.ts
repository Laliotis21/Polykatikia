import { describe, it, expect } from "vitest";
import {
  assertSafeBuildingId,
  MAX_RECEIPT_BYTES,
  sniffReceiptMime,
  validateReceiptBytes,
} from "./storage";

describe("assertSafeBuildingId", () => {
  it("accepts cuid-like ids", () => {
    expect(assertSafeBuildingId("clxyz0123456789abcdefghij")).toBe(
      "clxyz0123456789abcdefghij",
    );
  });

  it("accepts seed building ids", () => {
    expect(assertSafeBuildingId("seed-building-kolonaki")).toBe(
      "seed-building-kolonaki",
    );
  });

  it("rejects path traversal and separators", () => {
    expect(() => assertSafeBuildingId("../etc")).toThrow(/Invalid buildingId/);
    expect(() => assertSafeBuildingId("cabc/def")).toThrow(/Invalid buildingId/);
    expect(() => assertSafeBuildingId("cabc\\def")).toThrow(/Invalid buildingId/);
    expect(() => assertSafeBuildingId("cabc\0def")).toThrow(/Invalid buildingId/);
    expect(() => assertSafeBuildingId("not-a-cuid")).toThrow(/Invalid buildingId/);
  });
});

describe("sniffReceiptMime / validateReceiptBytes", () => {
  it("sniffs PDF / JPEG / PNG / WebP", () => {
    expect(sniffReceiptMime(Buffer.from("%PDF-1.4"))).toBe("application/pdf");
    expect(sniffReceiptMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffReceiptMime(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    const webp = Buffer.alloc(12);
    webp.write("RIFF", 0);
    webp.write("WEBP", 8);
    expect(sniffReceiptMime(webp)).toBe("image/webp");
  });

  it("rejects unknown bytes and oversized payloads", () => {
    expect(() => validateReceiptBytes(Buffer.from("not a file"))).toThrow(
      /Unrecognized|unsupported/i,
    );
    expect(() => validateReceiptBytes(Buffer.alloc(0))).toThrow(/Empty/);
    const huge = Buffer.alloc(MAX_RECEIPT_BYTES + 1);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    expect(() => validateReceiptBytes(huge)).toThrow(/10MB/);
  });

  it("accepts sniffed jpeg within size limit", () => {
    expect(
      validateReceiptBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])),
    ).toEqual({ mimeType: "image/jpeg" });
  });
});
