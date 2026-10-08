import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ href = "/ojol", className, inverted = false }: { href?: string; className?: string; inverted?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 leading-none", className)}>
      <span
        className={cn(
          "font-[family-name:var(--font-ojol-display)] text-[1.35rem] font-extrabold tracking-tight",
          inverted ? "text-white" : "text-ojol-ink",
        )}
      >
        ojol<span className="text-ojol-primary">.</span>mengaji
      </span>
    </Link>
  );
}
