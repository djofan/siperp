"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "danger" | "outline";
};

const VARIANT_STYLES: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-lazsip-primary-900 text-white hover:bg-lazsip-primary-800 dark:bg-lazsip-primary-700 dark:hover:bg-lazsip-primary-600",
  danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600/90 dark:hover:bg-red-600",
  outline: "border border-lazsip-primary-200 text-lazsip-primary-800 hover:border-lazsip-primary-400 dark:border-white/15 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/5",
};

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

export function LoadingButton({ loading, variant = "primary", className = "", children, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
