"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sipSiteConfig } from "@/modules/sip/components/siteConfig";
import { Button } from "@/modules/sip/components/ui/Button";
import { SipMark } from "@/modules/sip/components/SipMark";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/sip") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setOpen(false);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-white/95 px-4 py-2.5 shadow-md shadow-sip-primary-900/5 backdrop-blur-md sm:px-6">
        <Link href="/sip" onClick={handleLogoClick} className="flex items-center gap-2.5">
          <SipMark />
          <span className="text-lg font-extrabold tracking-tight text-sip-primary-900">{sipSiteConfig.name}</span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {sipSiteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-sip-primary-800/75 transition-colors hover:text-sip-primary-900"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:block">
          <Button href="/sip/kontak" variant="accent" className="px-5 py-2.5">
            Pengajuan Bantuan
          </Button>
        </div>

        <button
          type="button"
          aria-label="Buka menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-sip-primary-900 transition-colors lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-sip-primary-100 bg-white px-5 py-5 shadow-lg lg:hidden">
          <div className="flex flex-col gap-4">
            {sipSiteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-sip-primary-800/80"
              >
                {item.label}
              </Link>
            ))}
            <Button href="/sip/kontak" variant="accent" onClick={() => setOpen(false)}>
              Pengajuan Bantuan
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
