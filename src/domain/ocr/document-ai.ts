import type { OcrExtractInput, OcrExtractResult, OcrProvider } from "./types";

/** Google Document AI adapter — not configured in v1 unless env keys are wired. */
export class DocumentAiOcrProvider implements OcrProvider {
  async extract(_input: OcrExtractInput): Promise<OcrExtractResult> {
    throw new Error("OCR provider document_ai is not configured");
  }
}
