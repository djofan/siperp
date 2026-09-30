"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  ["Tentang", "/sarsip#tentang"],
  ["Kegiatan", "/sarsip/kegiatan"],
  ["Berita", "/sarsip/berita"],
  ["Campaign", "/sarsip/campaign"],
  ["Transparansi", "/sarsip#transparansi"],
];

export default function Navbar() {
  const isHome = usePathname() === "/sarsip";
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width: 1024px)");
    function onResize() {
      if (desktop.matches) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={`${isHome ? "fixed inset-x-0" : "sticky"} top-3 z-40 mx-auto max-w-6xl px-3 pt-3 sm:px-6`}>
      <div className="relative flex items-center justify-between gap-3 rounded-full border border-slate-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md lg:px-6">
        <Link href="/sarsip" onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-xl font-black text-white">S</span>
          <span className="text-xl font-black tracking-tight">SAR<span className="text-orange-600">SIP</span><span className="block text-[9px] font-semibold tracking-[.15em] text-slate-500">SEARCH & RESCUE</span></span>
        </Link>
        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
          aria-expanded={open}
          aria-controls="sarsip-navigation"
          onClick={() => setOpen(!open)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-900 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 lg:hidden"
        >
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        <nav
          id="sarsip-navigation"
          aria-label="Navigasi SARSIP"
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full mt-3 max-h-[calc(100dvh-7rem)] flex-col gap-1 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-3 text-sm font-medium shadow-xl lg:static lg:mt-0 lg:flex lg:max-h-none lg:flex-row lg:items-center lg:gap-5 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          {links.map(([label, href]) => (
            <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-orange-600 lg:p-0 lg:hover:bg-transparent">{label}</Link>
          ))}
          <Link href="/sarsip/campaign" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-orange-600 px-5 py-3 text-center font-bold text-white hover:bg-orange-700 lg:mt-0 lg:py-2.5">Donasi</Link>
        </nav>
      </div>
    </header>
  );
}
