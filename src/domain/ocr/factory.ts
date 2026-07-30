import { DocumentAiOcrProvider } from "./document-ai";
import { MockOcrProvider } from "./mock";
import { TextractOcrProvider } from "./textract";
import type { OcrProvider, OcrProviderName } from "./types";

function resolveProviderName(): OcrProviderName {
  const raw = (process.env.OCR_PROVIDER ?? "mock").trim().toLowerCase();
  if (raw === "mock" || raw === "document_ai" || raw === "textract") {
    return raw;
  }
  throw new Error(
    `Invalid OCR_PROVIDER="${raw}". Expected mock | document_ai | textract`,
  );
}

/** Select OCR adapter from `OCR_PROVIDER` (default `mock`). */
export function createOcrProvider(
  name: OcrProviderName = resolveProviderName(),
): OcrProvider {
  switch (name) {
    case "mock":
      return new MockOcrProvider();
    case "document_ai":
      return new DocumentAiOcrProvider();
    case "textract":
      return new TextractOcrProvider();
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown OCR provider: ${_exhaustive}`);
    }
  }
}
