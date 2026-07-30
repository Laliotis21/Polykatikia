"use client";

import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  const router = useRouter();
  const title = titleFor(pathname);

  async function signOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Config missing locally — still leave the dashboard.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5">
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      <button
        type="button"
        onClick={signOut}
        className="text-xs font-medium text-[var(--ink-muted)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        Sign out
      </button>
    </header>
  );
}
