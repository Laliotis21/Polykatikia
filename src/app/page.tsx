import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calculator,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { BrandLockup } from "@/components/shell/Brand";
import { buttonStyles } from "@/components/ui/Button";

const CAPABILITIES = [
  {
    icon: ScanLine,
    title: "Αποδείξεις με OCR",
    body: "Ανεβάστε τιμολόγιο ή απόδειξη και το ποσό διαβάζεται αυτόματα. Ο χειριστής επιβεβαιώνει πάντα πριν καταχωριστεί.",
  },
  {
    icon: ShieldCheck,
    title: "Καμία σιωπηλή διόρθωση",
    body: "Όταν το ποσό του χειριστή διαφέρει από το OCR, απαιτείται γραπτή αιτιολόγηση. Η απόκλιση μένει στο ιστορικό.",
  },
  {
    icon: Calculator,
    title: "Κατανομή σε χιλιοστά",
    body: "Γενικά, ανελκυστήρα και θέρμανση με ξεχωριστά κλειδιά. Τα ποσά τηρούνται σε ακέραια λεπτά — χωρίς σφάλματα στρογγυλοποίησης.",
  },
  {
    icon: Bell,
    title: "Ειδοποιήσεις ανωμαλιών",
    body: "Δαπάνη εκτός του συνηθισμένου εύρους του κτιρίου σηκώνει ειδοποίηση προτού φτάσει στους ιδιοκτήτες.",
  },
];

const FLOW = [
  { step: "01", label: "Ανέβασμα", detail: "PDF ή φωτογραφία απόδειξης" },
  { step: "02", label: "Έλεγχος", detail: "Επιβεβαίωση ποσού και προμηθευτή" },
  { step: "03", label: "Αιτιολόγηση", detail: "Γραπτή εξήγηση κάθε απόκλισης" },
  { step: "04", label: "Κατανομή", detail: "Χρέωση ανά διαμέρισμα σε χιλιοστά" },
];

const LEDGER_PREVIEW = [
  { label: "Α1", share: "250‰", amount: "148,75 €" },
  { label: "Α2", share: "250‰", amount: "148,75 €" },
  { label: "Β1", share: "300‰", amount: "178,50 €" },
  { label: "Β2", share: "200‰", amount: "119,00 €" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="glass-chrome sticky top-0 z-20 border-b border-border-soft">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <BrandLockup />
          <Link href="/login" className={buttonStyles("primary", "sm")}>
            Σύνδεση χειριστή
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 md:px-8">
        {/* Hero — one job: state the promise and get the operator in. */}
        <section className="grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="rise flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-aegean-200 bg-aegean-50 px-3 py-1 text-xs font-semibold text-aegean-700">
              <ShieldCheck className="size-3.5" aria-hidden strokeWidth={2.2} />
              Λογιστική ακεραιότητα σε ακέραια λεπτά
            </span>
            <h1 className="text-4xl font-extrabold text-ink">
              Κοινόχρηστα που{" "}
              <span className="relative whitespace-nowrap text-aegean-700">
                αντέχουν σε έλεγχο
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-1 h-2 rounded-full bg-brass-200/70"
                />
              </span>
              .
            </h1>
            <p className="max-w-xl text-lg text-ink-muted">
              Κάθε ευρώ που χρεώνεται σε διαμέρισμα ανάγεται σε μια απόδειξη, σε
              έναν χειριστή και σε μια χρονοσφραγίδα. Χωρίς αδιαφανή υπολογιστικά
              φύλλα, χωρίς αδικαιολόγητες διορθώσεις.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/login" className={buttonStyles("primary", "lg")}>
                Σύνδεση χειριστή
                <ArrowRight className="size-4" aria-hidden strokeWidth={2.2} />
              </Link>
              <Link href="#pos" className={buttonStyles("secondary", "lg")}>
                Πώς λειτουργεί
              </Link>
            </div>
          </div>

          {/* Product evidence, not decoration: a real allocation statement. */}
          <div
            className="rise panel p-6 shadow-lg md:p-7"
            style={{ "--rise-delay": "120ms" } as React.CSSProperties}
          >
            <div className="flex items-baseline justify-between gap-4 border-b border-border-soft pb-4">
              <div>
                <p className="eyebrow">Κολωνάκι 12 · Μάρτιος</p>
                <p className="mt-1 font-display text-lg font-bold text-ink">
                  Κατανομή θέρμανσης
                </p>
              </div>
              <p className="font-mono-amounts text-xl font-semibold text-ink">
                595,00 €
              </p>
            </div>
            <ul className="flex flex-col">
              {LEDGER_PREVIEW.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-4 border-b border-border-soft py-3 last:border-b-0"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-md bg-marble-100 font-display text-xs font-bold text-ink-muted">
                      {row.label}
                    </span>
                    <span className="font-mono-amounts text-sm text-ink-muted">
                      {row.share}
                    </span>
                  </span>
                  <span className="font-mono-amounts text-sm font-medium text-ink">
                    {row.amount}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck
                className="size-4 shrink-0 text-[var(--success)]"
                aria-hidden
                strokeWidth={2}
              />
              Άθροισμα κατανομής ίσο με το σύνολο δαπάνης — έλεγχος επιτυχής
            </p>
          </div>
        </section>

        {/* Capabilities — one job: what the tool actually does. */}
        <section
          className="rise border-t border-border-soft py-16 md:py-20"
          aria-labelledby="capabilities-title"
        >
          <h2
            id="capabilities-title"
            className="max-w-2xl text-3xl font-extrabold text-ink"
          >
            Φτιαγμένο για διαχειριστές που λογοδοτούν
          </h2>
          <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-aegean-50 text-aegean-600 ring-1 ring-aegean-100">
                  <Icon className="size-5" aria-hidden strokeWidth={1.9} />
                </span>
                <div className="flex flex-col gap-1.5">
                  <dt className="font-display text-lg font-bold text-ink">
                    {title}
                  </dt>
                  <dd className="text-ink-muted">{body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* Flow — one job: show the four steps of the operator's day. */}
        <section
          id="pos"
          className="rise scroll-mt-24 border-t border-border-soft py-16 md:py-20"
          aria-labelledby="flow-title"
        >
          <h2
            id="flow-title"
            className="max-w-2xl text-3xl font-extrabold text-ink"
          >
            Τέσσερα βήματα, από την απόδειξη στη χρέωση
          </h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map(({ step, label, detail }) => (
              <li
                key={step}
                className="flex flex-col gap-2 border-t-2 border-aegean-600 pt-4"
              >
                <span className="font-mono-amounts text-sm font-semibold text-brass-700">
                  {step}
                </span>
                <span className="font-display text-lg font-bold text-ink">
                  {label}
                </span>
                <span className="text-sm text-ink-muted">{detail}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing CTA — one job: sign in. */}
        <section className="rise border-t border-border-soft py-16 md:py-20">
          <div className="flex flex-col items-start gap-6 rounded-2xl bg-aegean-900 px-8 py-12 text-white md:px-12">
            <h2 className="max-w-2xl text-3xl font-extrabold text-white">
              Ξεκινήστε με τον λογαριασμό χειριστή σας
            </h2>
            <p className="max-w-xl text-aegean-100">
              Συνδεθείτε για να ανεβάσετε αποδείξεις, να ελέγξετε αποκλίσεις και
              να οριστικοποιήσετε τα κοινόχρηστα της περιόδου.
            </p>
            <Link
              href="/login"
              className={buttonStyles(
                "primary",
                "lg",
                "bg-white text-aegean-800 hover:bg-brass-100 hover:text-aegean-900",
              )}
            >
              Σύνδεση
              <ArrowRight className="size-4" aria-hidden strokeWidth={2.2} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-soft py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-ink-muted md:px-8">
          <p>Πολυκατοικία · Διαχείριση κοινοχρήστων</p>
          <p className="font-mono-amounts text-xs">
            Ποσά σε ακέραια λεπτά · el-GR · EUR
          </p>
        </div>
      </footer>
    </div>
  );
}
