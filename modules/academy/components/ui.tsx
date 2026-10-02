import type { ReactNode } from "react";

export const linkButton = "inline-flex min-h-11 items-center justify-center rounded-xl bg-lazsip-primary-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lazsip-primary-600";
export const inputClass = "mt-2 w-full rounded-xl border border-lazsip-primary-200 bg-white px-4 py-3 text-lazsip-ink outline-none focus:border-lazsip-primary-700 focus:ring-2 focus:ring-lazsip-primary-100";

export function PageHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <header className="mb-8">
    {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-lazsip-primary-600">{eyebrow}</p>}
    <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">{title}</h1>
    {children && <div className="mt-1 max-w-2xl text-sm text-gray-500">{children}</div>}
  </header>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-lazsip-primary-200 bg-white/60 p-10 text-center leading-7 text-lazsip-ink/70">{children}</div>;
}

export function LearnerNav() {
  return null;
}

export function ProgressBar({ value }: { value: number }) {
  return <div role="progressbar" aria-label="Progres materi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-lazsip-primary-100">
    <div className="h-full rounded-full bg-lazsip-primary-600" style={{ width: `${value}%` }} />
  </div>;
}
