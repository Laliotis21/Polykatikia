import { describe, it, expect } from "vitest";
import { MockOcrProvider } from "./mock";
import { createOcrProvider } from "./factory";
import { DocumentAiOcrProvider } from "./document-ai";
import { TextractOcrProvider } from "./textract";
import fixture from "../../../tests/fixtures/ocr/sample-receipt.json";

describe("MockOcrProvider", () => {
  it("returns deterministic amountCents for the same path", async () => {
    const p = new MockOcrProvider();
    const a = await p.extract({
      storagePath: "receipts/a.pdf",
      mimeType: "application/pdf",
    });
    const b = await p.extract({
      storagePath: "receipts/a.pdf",
      mimeType: "application/pdf",
    });
    expect(a.amountCents).toEqual(b.amountCents);
    expect(Number.isInteger(a.amountCents)).toBe(true);
    expect(a.amountCents).not.toBeNull();
  });

  it("returns fixture values for known receipt paths", async () => {
    const p = new MockOcrProvider();
    const result = await p.extract({
      storagePath: fixture.storagePath,
      mimeType: fixture.mimeType,
    });
    expect(result.amountCents).toBe(fixture.amountCents);
    expect(result.vendor).toBe(fixture.vendor);
    expect(result.date).toBe(fixture.date);
    expect(result.confidence).toBe(fixture.confidence);
  });

  it("never returns float cents", async () => {
    const p = new MockOcrProvider();
    for (const path of ["x/1.pdf", "x/2.jpg", "receipts/other.png"]) {
      const r = await p.extract({ storagePath: path, mimeType: "image/png" });
      expect(r.amountCents).not.toBeNull();
      expect(Number.isInteger(r.amountCents)).toBe(true);
    }
  });
});

describe("createOcrProvider", () => {
  it("defaults to mock", () => {
    const prev = process.env.OCR_PROVIDER;
    delete process.env.OCR_PROVIDER;
    try {
      expect(createOcrProvider()).toBeInstanceOf(MockOcrProvider);
    } finally {
      if (prev === undefined) delete process.env.OCR_PROVIDER;
      else process.env.OCR_PROVIDER = prev;
    }
  });

  it("stubs document_ai / textract as not configured", async () => {
    const doc = createOcrProvider("document_ai");
    const tex = createOcrProvider("textract");
    expect(doc).toBeInstanceOf(DocumentAiOcrProvider);
    expect(tex).toBeInstanceOf(TextractOcrProvider);
    await expect(
      doc.extract({ storagePath: "x", mimeType: "application/pdf" }),
    ).rejects.toThrow(/not configured/i);
    await expect(
      tex.extract({ storagePath: "x", mimeType: "application/pdf" }),
    ).rejects.toThrow(/not configured/i);
  });
});
