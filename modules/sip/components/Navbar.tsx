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

  // Tombol "Pengajuan Bantuan" langsung ke WhatsApp — dulu ngarah ke section
  // Kontak di landing page, tapi section itu dihapus karena info kontak udah
  // ada di footer semua halaman.
  const waNumber = process.env.NEXT_PUBLIC_SIP_WHATSAPP;
  const bantuanHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Assalamu'alaikum, saya ingin mengajukan bantuan / bertanya seputar SIP.")}`
    : "/sip#program";

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/sip") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setOpen(false);
  }

  // Semua section (Tentang, Program, Berita, dst) sekarang hidup sebagai anchor
  // di landing page, bukan halaman terpisah — kalau lagi di /sip, scroll halus
  // ke section-nya langsung tanpa reload. Kalau lagi di halaman lain (mis.
  // detail berita), biarkan Link navigasi normal ke /sip#section.
  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const hashIndex = href.indexOf("#");
    if (pathname === "/sip" && hashIndex !== -1) {
      e.preventDefault();
      const targetId = href.slice(hashIndex + 1);
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }
    setOpen(false);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-sip-primary-900/8 bg-sip-cream/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/sip" onClick={handleLogoClick} className="flex items-center gap-2.5">
          <SipMark />
          <span className="text-lg font-extrabold tracking-tight text-sip-primary-900">{sipSiteConfig.name}</span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {sipSiteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="border-b-2 border-transparent py-1 text-sm font-medium text-sip-primary-800/75 transition-colors hover:border-sip-primary-500 hover:text-sip-primary-900"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:block">
          <Button
            href={bantuanHref}
            variant="accent"
            className="px-5 py-2.5"
            target={waNumber ? "_blank" : undefined}
            rel={waNumber ? "noopener noreferrer" : undefined}
            onClick={(e) => handleNavClick(e, bantuanHref)}
          >
            Pengajuan Bantuan
          </Button>
        </div>

        <button
          type="button"
          aria-label="Buka menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center text-sip-primary-900 transition-colors lg:hidden"
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
        <div className="border-t border-sip-primary-900/8 bg-sip-cream px-4 py-5 shadow-lg sm:px-6 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            {sipSiteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-sm font-medium text-sip-primary-800/80"
              >
                {item.label}
              </Link>
            ))}
            <Button
              href={bantuanHref}
              variant="accent"
              target={waNumber ? "_blank" : undefined}
              rel={waNumber ? "noopener noreferrer" : undefined}
              onClick={(e) => handleNavClick(e, bantuanHref)}
            >
              Pengajuan Bantuan
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
