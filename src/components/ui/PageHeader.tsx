type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6 space-y-1 border-b border-[var(--border)] pb-4">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-[var(--ink-muted)]">{description}</p>
      ) : null}
    </header>
  );
}
