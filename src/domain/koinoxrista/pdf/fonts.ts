import path from "node:path";
import { Font } from "@react-pdf/renderer";

/** Unicode family with Greek coverage — Helvetica lacks Greek glyphs. */
export const PDF_FONT_FAMILY = "NotoSans";

let registered = false;

/** Idempotent: register Noto Sans regular+bold for @react-pdf. */
export function ensurePdfFontsRegistered(): void {
  if (registered) return;

  const dir = path.join(process.cwd(), "src/domain/koinoxrista/pdf/fonts");

  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      {
        src: path.join(dir, "NotoSans-Regular.ttf"),
        fontWeight: 400,
      },
      {
        src: path.join(dir, "NotoSans-Bold.ttf"),
        fontWeight: 700,
      },
    ],
  });

  // Default hyphenation splits Greek mid-word into mojibake-looking garbage.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
