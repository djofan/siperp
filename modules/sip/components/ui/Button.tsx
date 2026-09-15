import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "accent" | "outline-light" | "white";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-sip-primary-900 text-white hover:bg-sip-primary-800",
  secondary: "border border-sip-primary-900/20 bg-white text-sip-primary-900 hover:border-sip-primary-900/40",
  accent: "bg-sip-accent text-sip-ink hover:bg-sip-accent-hover",
  "outline-light": "border border-white/30 text-white hover:bg-white/10",
  white: "bg-white text-sip-primary-900 hover:bg-sip-primary-50",
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Button({
  href,
  variant = "primary",
  icon,
  fullWidthOnMobile = false,
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  icon?: "arrow" | "none";
  fullWidthOnMobile?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors";
  const widthClass = fullWidthOnMobile ? "w-full sm:w-auto" : "";

  return (
    <Link href={href} className={cn(base, VARIANTS[variant], widthClass, className)} {...rest}>
      {children}
      {icon === "arrow" && <ArrowIcon />}
    </Link>
  );
}
