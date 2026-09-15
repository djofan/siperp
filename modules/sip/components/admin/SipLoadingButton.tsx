"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "danger" | "outline";
};

const VARIANT_STYLES: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-sip-primary-900 text-white hover:bg-sip-primary-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-sip-primary-200 text-sip-primary-800 hover:border-sip-primary-400",
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
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
