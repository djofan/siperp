import Link from "next/link";
import { cn } from "@/lib/utils";

export function PublicWebsiteLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2", className)}
    >
      Lihat website publik
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
      </svg>
    </Link>
  );
}
