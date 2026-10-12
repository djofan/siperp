"use client";
import { PublicWebsiteLink } from "./PublicWebsiteLink";

export function Topbar({ onMenuClick, publicWebsiteHref }: { onMenuClick?: () => void; publicWebsiteHref?: string }) {
  return (
    <header className={`flex h-14 shrink-0 items-center px-4 sm:px-6 ${publicWebsiteHref ? "" : "lg:hidden"}`}>
      {onMenuClick && (
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}
      {publicWebsiteHref && <PublicWebsiteLink href={publicWebsiteHref} className="text-white/80 hover:text-white" />}
    </header>
  );
}
