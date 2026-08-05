import {
  Bell,
  Building2,
  Calculator,
  FileUp,
  Gauge,
  LayoutDashboard,
  ReceiptText,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Fallback when no building is selected yet (matches prisma/seed.ts). */
export const DEFAULT_BUILDING_ID = "seed-building-kolonaki";

const STORAGE_KEY = "polykatoikia:selected-building-id";

/** Fired after create/rename so shell + overview refresh building lists. */
export const BUILDINGS_CHANGED_EVENT = "polykatoikia:buildings-changed";

/** Fired when the active building id changes in the shell selector. */
export const BUILDING_SELECTION_EVENT = "polykatoikia:building-selected";

export function notifyBuildingsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BUILDINGS_CHANGED_EVENT));
}

export function notifyBuildingSelected(id: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BUILDING_SELECTION_EVENT, {
      detail: { buildingId: id },
    }),
  );
}

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Persist selected building for shell links outside `/buildings/:id/...`. */
export function readStoredBuildingId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredBuildingId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Quota / private mode — ignore.
  }
}

/**
 * Reads the building id out of the current path so building-scoped links keep
 * the user on the building they are already looking at.
 */
export function buildingIdFromPath(pathname: string): string | null {
  const match = /^\/buildings\/([^/]+)/.exec(pathname);
  // `/buildings` (list) has no id segment.
  if (!match?.[1] || match[1] === "new") return null;
  return match[1];
}

/** Active building: path → stored → seed default. */
export function resolveBuildingId(pathname: string): string {
  return (
    buildingIdFromPath(pathname) ??
    readStoredBuildingId() ??
    DEFAULT_BUILDING_ID
  );
}

/**
 * When switching buildings on a scoped route, keep the same leaf
 * (`/expenses`, `/koinoxrista`, `/shares`); otherwise go to expenses.
 */
export function buildingScopedHref(
  pathname: string,
  buildingId: string,
): string {
  const leaf = pathname.match(
    /^\/buildings\/[^/]+\/(expenses|koinoxrista|shares|collections|meters)/,
  )?.[1];
  return `/buildings/${buildingId}/${leaf ?? "expenses"}`;
}

export function navGroups(buildingId: string): NavGroup[] {
  return [
    {
      label: "Λειτουργία",
      items: [
        {
          href: "/overview",
          label: "Επισκόπηση",
          icon: LayoutDashboard,
          isActive: (p) => p === "/overview",
        },
        {
          href: "/receipts/upload",
          label: "Αποδείξεις",
          icon: FileUp,
          isActive: (p) => p.startsWith("/receipts"),
        },
        {
          href: "/alerts",
          label: "Ειδοποιήσεις",
          icon: Bell,
          isActive: (p) => p.startsWith("/alerts"),
        },
      ],
    },
    {
      label: "Κτίριο",
      items: [
        {
          href: "/buildings",
          label: "Κτίρια",
          icon: Building2,
          isActive: (p) => p === "/buildings",
        },
        {
          href: `/buildings/${buildingId}/expenses`,
          label: "Έξοδα",
          icon: ReceiptText,
          isActive: (p) => p.endsWith("/expenses"),
        },
        {
          href: `/buildings/${buildingId}/koinoxrista`,
          label: "Κοινόχρηστα",
          icon: Calculator,
          isActive: (p) => p.endsWith("/koinoxrista"),
        },
        {
          href: `/buildings/${buildingId}/meters`,
          label: "Ενδείξεις",
          icon: Gauge,
          isActive: (p) => p.endsWith("/meters"),
        },
        {
          href: `/buildings/${buildingId}/collections`,
          label: "Εισπράξεις",
          icon: Wallet,
          isActive: (p) => p.endsWith("/collections"),
        },
        {
          href: `/buildings/${buildingId}/shares`,
          label: "Χιλιοστά",
          icon: Scale,
          isActive: (p) => p.endsWith("/shares"),
        },
      ],
    },
  ];
}

/** Page titles for the top bar, longest-prefix first. */
const TITLES: Array<{ match: (p: string) => boolean; title: string }> = [
  { match: (p) => p === "/overview", title: "Επισκόπηση" },
  { match: (p) => p === "/buildings", title: "Κτίρια" },
  { match: (p) => p.startsWith("/receipts/upload"), title: "Νέα απόδειξη" },
  { match: (p) => /\/receipts\/[^/]+\/review/.test(p), title: "Έλεγχος OCR" },
  {
    match: (p) => /\/receipts\/[^/]+\/justify/.test(p),
    title: "Αιτιολόγηση απόκλισης",
  },
  { match: (p) => p.endsWith("/expenses"), title: "Έξοδα κτιρίου" },
  { match: (p) => p.endsWith("/koinoxrista"), title: "Κοινόχρηστα" },
  { match: (p) => p.endsWith("/meters"), title: "Ενδείξεις θέρμανσης" },
  { match: (p) => p.endsWith("/collections"), title: "Εισπράξεις" },
  { match: (p) => p.endsWith("/shares"), title: "Χιλιοστά & επαφές" },
  { match: (p) => p.startsWith("/alerts"), title: "Ειδοποιήσεις" },
];

export function titleFor(pathname: string): string {
  return TITLES.find((t) => t.match(pathname))?.title ?? "Πολυκατοικία";
}
