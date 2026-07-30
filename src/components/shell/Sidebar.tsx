"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  FileUp,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const NAV: NavItem[] = [
  {
    href: "/receipts/upload",
    label: "Receipt upload",
    icon: FileUp,
    match: (p) => p.startsWith("/receipts/upload"),
  },
  {
    href: "/buildings/seed-building-kolonaki/expenses",
    label: "Building expenses",
    icon: Building2,
    match: (p) => p.includes("/expenses"),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: Bell,
    match: (p) => p.startsWith("/alerts"),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)]"
      aria-label="Operator navigation"
    >
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
        <LayoutDashboard
          className="size-5 text-[var(--primary)]"
          aria-hidden
          strokeWidth={1.75}
        />
        <Link
          href="/receipts/upload"
          className="text-sm font-semibold tracking-tight text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          Polykatoikia
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-2" aria-label="Primary">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2.5 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                active
                  ? "bg-[var(--primary)] font-medium text-white"
                  : "text-[var(--ink)] hover:bg-[var(--surface-3)]"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-auto border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--ink-muted)]">
        Integrity operator · el-GR EUR
      </p>
    </aside>
  );
}
