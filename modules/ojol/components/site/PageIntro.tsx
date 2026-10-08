export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="intro-panel mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
      <p className="text-sm font-semibold text-ojol-primary">{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl text-balance font-[family-name:var(--font-ojol-display)] text-5xl font-extrabold leading-[1.05] tracking-tight">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-ojol-muted">{children}</div>}
    </section>
  );
}
