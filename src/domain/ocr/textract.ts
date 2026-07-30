import type { OcrExtractInput, OcrExtractResult, OcrProvider } from "./types";

/** AWS Textract adapter — not configured in v1 unless env keys are wired. */
export class TextractOcrProvider implements OcrProvider {
  async extract(_input: OcrExtractInput): Promise<OcrExtractResult> {
    throw new Error("OCR provider textract is not configured");
  }
}
