import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ href = "/tanwir", className, inverted = false }: { href?: string; className?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-baseline gap-1.5 leading-none", className)}>
      <span className={cn("font-[family-name:var(--font-tanwir-serif)] text-[1.6rem] tracking-tight", inverted ? "text-white" : "text-tanwir-ink")}>
        Tanwir
      </span>
      <span className={cn("text-xs font-medium uppercase tracking-[0.2em]", inverted ? "text-white/60" : "text-tanwir-muted")}>Qurani</span>
    </Link>
  );
}
