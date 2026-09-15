import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline-light" | "white";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-lazsip-primary-900 text-white hover:bg-lazsip-primary-800",
  secondary:
    "border border-lazsip-primary-900/20 bg-white text-lazsip-primary-900 hover:border-lazsip-primary-900/40",
  "outline-light": "border border-white/30 text-white hover:bg-white/10",
  white: "bg-white text-lazsip-primary-900 hover:bg-lazsip-primary-50",
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4M3 7l3-3h9M15 13h3a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-3a1 1 0 0 0 0 4z"
      />
    </svg>
  );
}

export function Button({
  href,
  variant = "primary",
  icon,
  disabled = false,
  fullWidthOnMobile = false,
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  icon?: "arrow" | "wallet" | "none";
  disabled?: boolean;
  fullWidthOnMobile?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href">) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors";
  const widthClass = fullWidthOnMobile ? "w-full sm:w-auto" : "";

  if (disabled) {
    return (
      <span
        aria-disabled
        className={cn(base, widthClass, "cursor-not-allowed bg-lazsip-primary-900/10 text-lazsip-primary-900/40", className)}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(base, VARIANTS[variant], widthClass, className)} {...rest}>
      {children}
      {icon === "arrow" && <ArrowIcon />}
      {icon === "wallet" && <WalletIcon />}
    </Link>
  );
}
