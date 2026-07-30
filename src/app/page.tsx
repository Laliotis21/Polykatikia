export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-[var(--primary)]">
        Polykatoikia
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
        Integrity kernel scaffold
      </h1>
      <p className="max-w-xl text-[var(--ink-muted)]">
        Operator dashboard screens land under{" "}
        <span className="font-mono-amounts text-sm text-[var(--ink)]">
          /(dashboard)
        </span>
        . Money is integer cents only.
      </p>
    </main>
  );
}
