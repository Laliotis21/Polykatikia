"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchBuildings } from "@/components/api/operator-api";
import {
  BUILDINGS_CHANGED_EVENT,
  buildingScopedHref,
  notifyBuildingSelected,
  readStoredBuildingId,
  writeStoredBuildingId,
} from "@/components/shell/nav";
import { controlStyles } from "@/components/ui/Field";
import type { BuildingSummary } from "@/lib/api-types";
import { cn } from "@/lib/cn";

type BuildingSelectorProps = {
  buildingId: string;
  onBuildingChange: (id: string) => void;
  onNavigate?: () => void;
};

/**
 * Shell building switcher. Persists selection and rewrites building-scoped
 * routes so Έξοδα / Κοινόχρηστα / Χιλιοστά stay on the chosen building.
 */
export function BuildingSelector({
  buildingId,
  onBuildingChange,
  onNavigate,
}: BuildingSelectorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const buildingIdRef = useRef(buildingId);
  buildingIdRef.current = buildingId;
  const onBuildingChangeRef = useRef(onBuildingChange);
  onBuildingChangeRef.current = onBuildingChange;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchBuildings();
      if (cancelled) return;
      setBuildings(result.data);
      // After create, buildings page writes storage before notifying —
      // adopt that id so the select value matches without remount.
      const stored = readStoredBuildingId();
      if (stored && stored !== buildingIdRef.current) {
        const known = result.data.some((b) => b.id === stored);
        if (known) {
          onBuildingChangeRef.current(stored);
          notifyBuildingSelected(stored);
        }
      }
    }

    void load();
    function onBuildingsChanged() {
      void load();
    }
    window.addEventListener(BUILDINGS_CHANGED_EVENT, onBuildingsChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(BUILDINGS_CHANGED_EVENT, onBuildingsChanged);
    };
  }, []);

  function onChange(nextId: string) {
    writeStoredBuildingId(nextId);
    onBuildingChange(nextId);
    notifyBuildingSelected(nextId);
    if (/^\/buildings\/[^/]+\/(expenses|koinoxrista|shares)/.test(pathname)) {
      router.push(buildingScopedHref(pathname, nextId));
    }
    onNavigate?.();
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 pb-2">
      <label
        htmlFor="shell-building-select"
        className="eyebrow px-0 text-ink-subtle"
      >
        Ενεργό κτίριο
      </label>
      <select
        id="shell-building-select"
        className={cn(controlStyles, "min-h-10 cursor-pointer text-sm")}
        value={buildingId}
        onChange={(e) => onChange(e.target.value)}
        disabled={buildings.length === 0}
      >
        {buildings.length === 0 ? (
          <option value={buildingId}>Φόρτωση…</option>
        ) : (
          buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
