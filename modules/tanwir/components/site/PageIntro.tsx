export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="intro-panel mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-tanwir-gold">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-balance font-[family-name:var(--font-tanwir-serif)] text-5xl leading-[1.08] tracking-tight">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-tanwir-muted">{children}</div>}
    </section>
  );
}
