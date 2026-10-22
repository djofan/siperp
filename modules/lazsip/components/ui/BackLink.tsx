import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="flex w-fit max-w-full">
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 rounded-md py-2 text-sm font-semibold leading-relaxed text-lazsip-primary-800/70 transition-colors hover:text-lazsip-primary-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lazsip-primary-600 dark:text-white/60 dark:hover:text-white"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {children}
    </Link>
    </div>
  );
}
