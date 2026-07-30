"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { titleFor } from "@/components/shell/nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Διαχειριστής",
  OPERATOR: "Χειριστής",
  VIEWER: "Θεατής",
};

type TopBarProps = {
  onOpenNav: () => void;
  user: { email: string; role: string } | null;
};

export function TopBar({ onOpenNav, user }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleFor(pathname);
  const initial = user?.email.charAt(0).toUpperCase() ?? "—";

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
    <header className="glass-chrome sticky top-0 z-20 flex h-15 shrink-0 items-center gap-3 border-b border-border-soft px-4 md:px-8">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Άνοιγμα πλοήγησης"
        className="-ml-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors duration-200 hover:bg-marble-100 hover:text-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden strokeWidth={2} />
      </button>

      <p className="min-w-0 flex-1 truncate font-display text-base font-bold tracking-tight text-ink">
        {title}
      </p>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full bg-aegean-600 font-display text-sm font-bold text-white"
            >
              {initial}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="max-w-44 truncate text-xs font-medium text-ink">
                {user.email}
              </span>
              <span className="text-2xs text-ink-subtle">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </span>
          </div>
          <Badge tone="primary" className="hidden md:inline-flex">
            {ROLE_LABELS[user.role] ?? user.role}
          </Badge>
        </div>
      ) : null}

      <button
        type="button"
        onClick={signOut}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-marble-100 hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden strokeWidth={2} />
        <span className="hidden sm:inline">Αποσύνδεση</span>
        <span className="sr-only sm:hidden">Αποσύνδεση</span>
      </button>
    </header>
  );
}
