import type { Metadata, Viewport } from "next";
import { Commissioner, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

/** Display voice: geometric, confident, full Greek coverage. */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "greek"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

/** Reading voice: humanist and legible at the small sizes a ledger demands. */
const commissioner = Commissioner({
  variable: "--font-commissioner",
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Money voice: tabular figures so amounts align column-to-column. */
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Πολυκατοικία — Διαχείριση κοινοχρήστων",
    template: "%s · Πολυκατοικία",
  },
  description:
    "Διαχείριση κοινοχρήστων με έλεγχο ακεραιότητας: αποδείξεις, OCR, αιτιολόγηση αποκλίσεων και ειδοποιήσεις.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f9fa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="el"
      className={`${manrope.variable} ${commissioner.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-ink">
        <div className="app-backdrop" aria-hidden />
        <a
          href="#main"
          className="sr-only rounded-md bg-aegean-600 px-4 py-2 text-sm font-semibold text-white focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:z-50"
        >
          Μετάβαση στο περιεχόμενο
        </a>
        {children}
      </body>
    </html>
  );
}
