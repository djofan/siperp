import Image from "next/image";
import { cn } from "./ui/utils";

/** Keep the supplied green/gold artwork unchanged on a neutral backing. */
export function AcademyLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <span className={cn("academy-logo inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5", compact ? "h-10 w-10" : "h-16 w-24", className)}>
    <Image src={compact ? "/academy/logo-mark.webp" : "/academy/logo-full.webp"} alt="Insan Academy" width={compact ? 431 : 720} height={compact ? 512 : 520} className="h-full w-full object-contain" unoptimized />
  </span>;
}
