"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { filterNavByHidden, sipSiteConfig } from "@/modules/sip/components/siteConfig";
import { Button } from "@/modules/sip/components/ui/Button";
import { SipMark } from "@/modules/sip/components/SipMark";

export function Navbar({ hiddenAnchors = [] }: { hiddenAnchors?: string[] }) {
  const nav = filterNavByHidden(sipSiteConfig.nav, hiddenAnchors);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Navbar transparan di paling atas, baru dapat latar putih + bayangan halus setelah
  // halaman di-scroll — supaya hero terasa lega.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
        scrolled || open ? "bg-white/80 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/sip" onClick={handleLogoClick} className="flex items-center gap-2.5">
          <SipMark />
          <span className="text-base font-bold leading-tight tracking-tight text-sip-primary-900 sm:text-lg">{sipSiteConfig.fullName}</span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="text-sm font-medium text-sip-primary-900/60 transition-colors hover:text-sip-primary-900"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:block">
          <Button
            href={bantuanHref}
            variant="primary"
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
          className="flex h-10 w-10 items-center justify-center rounded-full text-sip-primary-900 transition-colors hover:bg-sip-primary-50 lg:hidden"
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
        <div className="px-4 pb-6 pt-2 sm:px-6 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-sip-primary-900/75 transition-colors hover:bg-sip-primary-50"
              >
                {item.label}
              </Link>
            ))}
            <Button
              href={bantuanHref}
              variant="primary"
              className="mt-3"
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
