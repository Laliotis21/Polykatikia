"use client";

import { usePathname } from "next/navigation";

const TITLES: Array<{ match: (p: string) => boolean; title: string }> = [
  { match: (p) => p.startsWith("/receipts/upload"), title: "Receipt upload" },
  {
    match: (p) => /\/receipts\/[^/]+\/review/.test(p),
    title: "OCR review",
  },
  {
    match: (p) => /\/receipts\/[^/]+\/justify/.test(p),
    title: "Mismatch justification",
  },
  { match: (p) => p.includes("/expenses"), title: "Building expenses" },
  { match: (p) => p.startsWith("/alerts"), title: "Alerts inbox" },
];

function titleFor(pathname: string): string {
  return TITLES.find((t) => t.match(pathname))?.title ?? "Operator";
}

export function TopBar() {
  const pathname = usePathname();
  const title = titleFor(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5">
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      <p className="font-mono-amounts text-xs text-[var(--ink-muted)]">
        OPERATOR
      </p>
    </header>
  );
}
