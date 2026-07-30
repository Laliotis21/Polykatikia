import {
  Bell,
  Calculator,
  FileUp,
  LayoutDashboard,
  ReceiptText,
  Scale,
  type LucideIcon,
} from "lucide-react";

/** Building shown in the shell until multi-building selection ships. */
export const DEFAULT_BUILDING_ID = "seed-building-kolonaki";

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

/**
 * Reads the building id out of the current path so building-scoped links keep
 * the user on the building they are already looking at.
 */
export function buildingIdFromPath(pathname: string): string {
  const match = /^\/buildings\/([^/]+)/.exec(pathname);
  return match?.[1] ?? DEFAULT_BUILDING_ID;
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
  { match: (p) => p.startsWith("/receipts/upload"), title: "Νέα απόδειξη" },
  { match: (p) => /\/receipts\/[^/]+\/review/.test(p), title: "Έλεγχος OCR" },
  {
    match: (p) => /\/receipts\/[^/]+\/justify/.test(p),
    title: "Αιτιολόγηση απόκλισης",
  },
  { match: (p) => p.endsWith("/expenses"), title: "Έξοδα κτιρίου" },
  { match: (p) => p.endsWith("/koinoxrista"), title: "Κοινόχρηστα" },
  { match: (p) => p.endsWith("/shares"), title: "Χιλιοστά" },
  { match: (p) => p.startsWith("/alerts"), title: "Ειδοποιήσεις" },
];

export function titleFor(pathname: string): string {
  return TITLES.find((t) => t.match(pathname))?.title ?? "Πολυκατοικία";
}
