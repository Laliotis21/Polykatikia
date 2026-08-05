import { renderToBuffer } from "@react-pdf/renderer";
import { KoinoxristaPdfDocument } from "./document";
import {
  buildKoinoxristaPdfViewModel,
  type KoinoxristaPdfInput,
} from "./view-model";

/** Render κοινόχρηστα multi-page PDF as a Node Buffer. */
export async function renderKoinoxristaPdf(
  input: KoinoxristaPdfInput,
): Promise<Buffer> {
  const vm = buildKoinoxristaPdfViewModel(input);
  const buffer = await renderToBuffer(<KoinoxristaPdfDocument vm={vm} />);
  return Buffer.from(buffer);
}

export function koinoxristaPdfFilename(input: {
  year: number;
  month: number;
}): string {
  const mm = String(input.month).padStart(2, "0");
  return `koinoxrista-${input.year}-${mm}.pdf`;
}
