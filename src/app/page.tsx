import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--primary)]">
        Polykatoikia
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
        Integrity-first operator tool
      </h1>
      <p className="max-w-xl text-[var(--ink-muted)]">
        Upload receipts, review OCR amounts, justify mismatches, and track
        building expenses with integer-cents integrity.
      </p>
      <div className="pt-2">
        <Link
          href="/receipts/upload"
          className="inline-flex min-h-11 items-center bg-[var(--primary)] px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          Open operator dashboard
        </Link>
      </div>
    </main>
  );
}
