"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "lime" | "danger" | "outline";
};

const VARIANT_STYLES: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-sip-lime text-sip-ink hover:bg-sip-lime-hover",
  lime: "bg-sip-lime text-sip-ink hover:bg-sip-lime-hover",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline: "bg-white/[0.06] text-white/80 hover:bg-white/10",
};

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

export function SipLoadingButton({ loading, variant = "primary", className = "", children, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sip-lime/60 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
