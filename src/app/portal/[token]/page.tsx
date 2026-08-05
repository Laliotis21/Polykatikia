"use client";

import { use, useEffect, useState, useTransition } from "react";
import { Banknote, Check, Home } from "lucide-react";
import { MoneyText } from "@/components/money/MoneyText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchPortal, portalPayCharge } from "@/components/api/operator-api";
import type { PortalPayload } from "@/lib/api-types";

export default function OwnerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<PortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function reload() {
    const result = await fetchPortal(token);
    setData(result.data);
    if (!result.ok) setError(result.message);
    else setError(null);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await fetchPortal(token);
      if (cancelled) return;
      setData(result.data);
      if (!result.ok) setError(result.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function onPay(chargeId: string) {
    setError(null);
    setPayingId(chargeId);
    startTransition(async () => {
      const result = await portalPayCharge(token, chargeId);
      setPayingId(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await reload();
    });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <LoadingState label="Φόρτωση οφειλών…" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon={Home}
          title="Μη έγκυρος σύνδεσμος"
          description={error ?? "Επικοινωνήστε με τη διαχείριση."}
        />
      </main>
    );
  }

  const open = data.charges.filter((c) => c.status === "OPEN");
  const paid = data.charges.filter((c) => c.status === "PAID");

  return (
    <main className="min-h-dvh bg-[var(--surface)] text-[var(--ink)]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-5">
          <Home className="size-5 text-[var(--primary)]" aria-hidden />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Portal ιδιοκτήτη
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              {data.owner.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Ανοιχτές οφειλές
          </h2>
          {open.length === 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Δεν υπάρχουν ανοιχτές χρεώσεις.
            </p>
          ) : (
            open.map((c) => (
              <article
                key={c.chargeId}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {c.buildingName} · {c.apartmentLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {c.description}
                    </p>
                  </div>
                  <Badge tone="warning">Ανοιχτό</Badge>
                </div>
                {c.lines.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    {c.lines.map((line, i) => (
                      <li
                        key={`${c.chargeId}-${i}`}
                        className="flex justify-between gap-2"
                      >
                        <span>{line.categoryName ?? "Κατηγορία"}</span>
                        <MoneyText cents={line.amountCents} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="font-mono-amounts text-lg font-semibold">
                    <MoneyText cents={c.amountCents} />
                  </p>
                  <Button
                    type="button"
                    disabled={payingId === c.chargeId}
                    onClick={() => onPay(c.chargeId)}
                  >
                    <Banknote className="size-4" aria-hidden />
                    {payingId === c.chargeId
                      ? "Πληρωμή…"
                      : "Πληρωμή (demo)"}
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>

        {paid.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Πληρωμένα
            </h2>
            {paid.map((c) => (
              <article
                key={c.chargeId}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {c.buildingName} · {c.apartmentLabel}
                    </p>
                    <p className="text-xs text-slate-500">{c.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                    <Check className="size-3.5" aria-hidden />
                    <MoneyText cents={c.amountCents} />
                  </span>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        <p className="text-center text-xs text-slate-400">
          Demo πληρωμή — χωρίς πραγματική τράπεζα / IRIS.
        </p>
      </div>
    </main>
  );
}
