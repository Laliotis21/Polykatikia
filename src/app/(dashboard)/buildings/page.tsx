"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Field, inputStyles } from "@/components/ui/Field";
import {
  createBuilding,
  fetchBuildings,
  patchBuilding,
} from "@/components/api/operator-api";
import {
  notifyBuildingsChanged,
  writeStoredBuildingId,
} from "@/components/shell/nav";
import type { BuildingSummary } from "@/lib/api-types";
import { useRouter } from "next/navigation";

export default function BuildingsPage() {
  const router = useRouter();
  const formId = useId();
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const result = await fetchBuildings();
    setBuildings(result.data);
    setPending(!result.ok && Boolean(result.pending));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function startEdit(b: BuildingSummary) {
    setEditingId(b.id);
    setName(b.name);
    setAddress(b.address ?? "");
    setError(null);
    setStatus(null);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setAddress("");
  }

  function submit() {
    setError(null);
    setStatus(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Το όνομα κτιρίου είναι υποχρεωτικό.");
      return;
    }
    const payload = {
      name: trimmedName,
      address: address.trim() === "" ? null : address.trim(),
    };

    startTransition(async () => {
      if (editingId) {
        const result = await patchBuilding({ id: editingId, ...payload });
        if (!result.ok || !result.data) {
          setError(
            result.ok ? "Η ενημέρωση δεν επιβεβαιώθηκε." : result.message,
          );
          return;
        }
        setStatus(`Ενημερώθηκε: ${result.data.name}`);
      } else {
        const result = await createBuilding(payload);
        if (!result.ok || !result.data) {
          setError(
            result.ok ? "Η δημιουργία δεν επιβεβαιώθηκε." : result.message,
          );
          return;
        }
        writeStoredBuildingId(result.data.id);
        setStatus(`Δημιουργήθηκε: ${result.data.name}`);
      }
      resetForm();
      await reload();
      notifyBuildingsChanged();
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Διαχείριση"
        title="Κτίρια"
        description="Προσθέστε ή επεξεργαστείτε κτίρια. Το ενεργό κτίριο επιλέγεται από την πλαϊνή μπάρα."
      />

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p
          role="status"
          className="rounded-md border border-[color-mix(in_srgb,var(--success)_30%,white)] bg-[var(--success-soft)] px-3 py-2.5 text-sm font-medium text-[var(--success)]"
        >
          {status}
        </p>
      ) : null}

      <Section
        title={editingId ? "Επεξεργασία κτιρίου" : "Νέο κτίριο"}
        description="Όνομα και διεύθυνση — χωρίς διαμερίσματα ακόμα (προστίθενται ξεχωριστά)."
        order={0}
      >
        <form
          className="flex max-w-xl flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field htmlFor={`${formId}-name`} label="Όνομα">
            <input
              id={`${formId}-name`}
              className={inputStyles}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Κολωνάκι 12"
              required
              maxLength={120}
            />
          </Field>
          <Field
            htmlFor={`${formId}-address`}
            label="Διεύθυνση"
            aside="προαιρετικό"
          >
            <input
              id={`${formId}-address`}
              className={inputStyles}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="π.χ. Σκουφά 12, Αθήνα"
              maxLength={240}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={isPending}>
              {editingId ? (
                <>
                  <Pencil className="size-4" aria-hidden strokeWidth={2} />
                  Αποθήκευση
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden strokeWidth={2} />
                  Προσθήκη
                </>
              )}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={resetForm}
              >
                Ακύρωση
              </Button>
            ) : null}
          </div>
        </form>
      </Section>

      {loading ? (
        <LoadingState label="Φόρτωση κτιρίων…" />
      ) : buildings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Δεν υπάρχουν κτίρια"
          description="Προσθέστε το πρώτο κτίριο για να ξεκινήσετε."
          pending={pending}
        />
      ) : (
        <Section title="Λίστα κτιρίων" order={1}>
          <ul className="flex flex-col gap-2">
            {buildings.map((b) => (
              <li
                key={b.id}
                className="panel flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink">{b.name}</p>
                  <p className="text-sm text-ink-muted">
                    {b.address ?? "Χωρίς διεύθυνση"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      writeStoredBuildingId(b.id);
                      router.push(`/buildings/${b.id}/expenses`);
                    }}
                  >
                    Άνοιγμα
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startEdit(b)}
                  >
                    Επεξεργασία
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
