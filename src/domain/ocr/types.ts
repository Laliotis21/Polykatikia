/** Result of a single OCR extract pass. Money is always integer cents when present. */
export type OcrExtractResult = {
  amountCents: number | null;
  vendor: string | null;
  /** ISO date (YYYY-MM-DD) when the provider can parse one. */
  date: string | null;
  /** 0–1 confidence; mock may return a fixed high value. */
  confidence: number | null;
  raw: unknown;
};

export type OcrExtractInput = {
  storagePath: string;
  mimeType: string;
};

export interface OcrProvider {
  extract(input: OcrExtractInput): Promise<OcrExtractResult>;
}

export type OcrProviderName = "mock" | "document_ai" | "textract";
