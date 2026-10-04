import Link from "next/link";
import { cn } from "@/lib/utils";

// Varian tombol landing page SIP (tema terang, warna dari logo resmi):
// - primary: hijau tua logo — aksi utama
// - soft: tint hijau muda — aksi sekunder di latar putih/krem
// - white: dipakai di atas pita hijau tua (Jangkauan, footer)
// - ghost-light: aksi sekunder di atas pita hijau tua
type Variant = "primary" | "soft" | "white" | "ghost-light";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-sip-primary-900 text-white hover:bg-sip-primary-800",
  soft: "bg-sip-primary-50 text-sip-primary-900 hover:bg-sip-primary-100",
  white: "bg-white text-sip-primary-900 hover:bg-sip-primary-50",
  "ghost-light": "bg-white/10 text-white hover:bg-white/15",
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
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
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sip-primary-500 focus-visible:ring-offset-2";
  const widthClass = fullWidthOnMobile ? "w-full sm:w-auto" : "";

  return (
    <Link href={href} className={cn(base, VARIANTS[variant], widthClass, className)} {...rest}>
      {children}
      {icon === "arrow" && <ArrowIcon />}
    </Link>
  );
}
