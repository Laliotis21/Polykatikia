"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/shell/Brand";
import { buildingIdFromPath, navGroups } from "@/components/shell/nav";
import { cn } from "@/lib/cn";

type SidebarProps = {
  /** Closes the mobile drawer after a destination is chosen. */
  onNavigate?: () => void;
};

/**
 * Primary navigation. Rendered as a fixed rail on desktop and inside the
 * drawer on small screens, so both share one source of truth.
 */
export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const groups = navGroups(buildingIdFromPath(pathname));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-15 shrink-0 items-center px-5">
        <Link
          href="/overview"
          onClick={onNavigate}
          className="rounded-md py-2"
          aria-label="Πολυκατοικία — αρχική"
        >
          <BrandLockup subtitle="Διαχείριση κοινοχρήστων" />
        </Link>
      </div>

      <nav
        aria-label="Κύρια πλοήγηση"
        className="flex flex-1 flex-col gap-7 overflow-y-auto px-3 py-5"
      >
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="eyebrow px-3 pb-2">{group.label}</p>
            {group.items.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-200 ease-out",
                    active
                      ? "bg-aegean-50 font-semibold text-aegean-800"
                      : "font-medium text-ink-muted hover:bg-marble-100 hover:text-ink",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-aegean-600 transition-transform duration-200 ease-out",
                      active ? "scale-y-100" : "scale-y-0",
                    )}
                  />
                  <Icon
                    className={cn(
                      "size-[18px] shrink-0 transition-colors duration-200",
                      active
                        ? "text-aegean-600"
                        : "text-ink-subtle group-hover:text-ink-muted",
                    )}
                    aria-hidden
                    strokeWidth={active ? 2.2 : 1.9}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border-soft px-5 py-4">
        <p className="text-xs text-ink-subtle">
          Ακεραιότητα δεδομένων · el-GR · EUR
        </p>
      </div>
    </div>
  );
}
