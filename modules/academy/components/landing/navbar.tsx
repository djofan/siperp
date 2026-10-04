/* eslint-disable @next/next/no-img-element -- Logo lokal dari project referensi. */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "../icons";

interface NavbarProps {
  isLoggedIn: boolean;
  dashboardHref?: "/academy/belajar" | "/academy/pengajar";
}

export function Navbar({ isLoggedIn, dashboardHref = "/academy/belajar" }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={[
      "fixed top-0 z-50 w-full bg-white/95 backdrop-blur-sm transition-all duration-200",
      scrolled ? "shadow-sm border-b border-gray-100" : ""].join(" ")}>
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/academy" className="flex items-center gap-2.5 font-semibold">
          <img src="/academy/logo-lazsip.webp" alt="LAZSIP" className="h-7 w-7 object-contain" />
          <span className="text-gray-900">Insan Academy</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 sm:flex">
          {isLoggedIn ? (
            <a href={dashboardHref} className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
              Dashboard
            </a>
          ) : (
            <>
              <a href="/academy/masuk" className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Masuk
              </a>
              <Link href="/academy/daftar" className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
                Daftar
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} className="flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-2">
            <a href="/academy/#programs" className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
              Program
            </a>
            {isLoggedIn ? (
              <a href={dashboardHref} className="rounded-lg bg-green-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-green-700">
                Dashboard
              </a>
            ) : (
              <>
                <a href="/academy/masuk" className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Masuk
                </a>
                <Link href="/academy/daftar" className="rounded-lg bg-green-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-green-700">
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
