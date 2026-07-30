"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/shell/Brand";
import { Button } from "@/components/ui/Button";
import { Field, inputStyles } from "@/components/ui/Field";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ASSURANCES = [
  "Κάθε χρέωση συνδέεται με απόδειξη και χειριστή",
  "Οι αποκλίσεις OCR απαιτούν γραπτή αιτιολόγηση",
  "Τα ποσά τηρούνται σε ακέραια λεπτά",
];

export default function LoginPage() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("admin@polykatoikia.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      router.replace("/overview");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Η σύνδεση απέτυχε");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[1fr_1.1fr]">
      {/* Assurance panel — desktop only; the form is the job on mobile. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-aegean-900 p-12 text-white lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(38rem 28rem at 12% 8%, rgb(56 188 191 / 0.30), transparent 62%), radial-gradient(30rem 24rem at 92% 88%, rgb(229 167 58 / 0.24), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <span className="font-display text-lg font-extrabold tracking-tight">
            Πολυκατοικία
          </span>
        </div>

        <div className="relative flex flex-col gap-8">
          <h2 className="max-w-md text-3xl font-extrabold text-white">
            Η διαχείριση κοινοχρήστων, με ίχνος ελέγχου σε κάθε ευρώ.
          </h2>
          <ul className="flex flex-col gap-4">
            {ASSURANCES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-aegean-100">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-brass-300"
                  aria-hidden
                  strokeWidth={2}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono-amounts text-xs text-aegean-200">
          el-GR · EUR · ακέραια λεπτά
        </p>
      </aside>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-12 md:px-8"
      >
        <div className="rise flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-6 lg:hidden">
            <BrandLockup />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold text-ink">Σύνδεση</h1>
            <p className="text-ink-muted">
              Χρησιμοποιήστε τον λογαριασμό διαχειριστή ή χειριστή σας.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <Field htmlFor={emailId} label="Email">
              <input
                id={emailId}
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyles}
              />
            </Field>

            <Field htmlFor={passwordId} label="Κωδικός πρόσβασης">
              <input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputStyles}
              />
            </Field>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              loading={pending}
              loadingLabel="Σύνδεση…"
              className="w-full"
            >
              Σύνδεση
            </Button>
          </form>

          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-md text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-aegean-700"
          >
            <ArrowLeft className="size-4" aria-hidden strokeWidth={2} />
            Επιστροφή στην αρχική
          </Link>
        </div>
      </main>
    </div>
  );
}
