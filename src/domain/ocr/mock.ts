import { createHash } from "node:crypto";
import { assertCents } from "@/domain/money";
import type { OcrExtractInput, OcrExtractResult, OcrProvider } from "./types";

/** Known fixture paths → deterministic OCR draft (CI-safe). */
const FIXTURES: Record<
  string,
  {
    amountCents: number;
    vendor: string;
    date: string;
    confidence: number;
  }
> = {
  "receipts/fixture-known.pdf": {
    amountCents: 4520,
    vendor: "ΔΕΗ Α.Ε.",
    date: "2026-01-15",
    confidence: 0.97,
  },
  "receipts/fixture-elevator.jpg": {
    amountCents: 12800,
    vendor: "Ανελκυστήρες Αττική",
    date: "2026-03-02",
    confidence: 0.91,
  },
};

/**
 * Offline OCR adapter: fixture map first, else stable hash of path → cents in a fixed range.
 */
export class MockOcrProvider implements OcrProvider {
  async extract(input: OcrExtractInput): Promise<OcrExtractResult> {
    const fixture = FIXTURES[input.storagePath];
    if (fixture) {
      return {
        amountCents: assertCents(fixture.amountCents),
        vendor: fixture.vendor,
        date: fixture.date,
        confidence: fixture.confidence,
        raw: { provider: "mock", source: "fixture", mimeType: input.mimeType },
      };
    }

    const digest = createHash("sha256").update(input.storagePath).digest();
    // Map first 4 bytes into 500–9999 cents (integer only).
    const n = digest.readUInt32BE(0);
    const amountCents = assertCents(500 + (n % 9500));

    return {
      amountCents,
      vendor: "Mock Vendor",
      date: null,
      confidence: 0.85,
      raw: {
        provider: "mock",
        source: "hash",
        mimeType: input.mimeType,
        pathHash: digest.toString("hex").slice(0, 16),
      },
    };
  }
}
