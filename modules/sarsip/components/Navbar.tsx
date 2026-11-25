"use client";


import styles from "./Landing.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SarsipMark } from "@/modules/sarsip/components/SarsipMark";

const links = [
  ["Beranda", "/sarsip"],
  ["Campaign", "/sarsip#campaign"],
  ["Berita", "/sarsip#berita"],
  ["Tentang", "/sarsip#tentang"],
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    setOpen(false);
    if (pathname !== "/sarsip" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = href.split("#")[1];
    const target = id ? document.getElementById(id) : document.documentElement;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    window.history.replaceState(null, "", href);
  }

  return (
    <header ref={headerRef} className={`${styles.navbar} ${pathname === "/sarsip" && !scrolled && !open ? styles.navSeamless : ""}`}>
      <div className={styles.navInner}>
        <Link href="/sarsip" onClick={(event) => navigate(event, "/sarsip")} className={styles.navBrand}>
          <SarsipMark className={styles.navLogo}/>
          <span className={styles.brandName}>SAR<span className="text-[#629439]">SIP</span><span className={styles.brandCaption}>SEARCH & RESCUE</span></span>
        </Link>
        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
          aria-expanded={open}
          aria-controls="sarsip-navigation"
          onClick={() => setOpen(!open)}
          className={styles.menuButton}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 8h16M4 16h16"} />
          </svg>
        </button>
        <nav
          id="sarsip-navigation"
          aria-label="Navigasi SARSIP"
          className={`${styles.navLinks} ${open ? styles.navOpen : ""}`}
        >
          {links.map(([label, href]) => (
            <Link key={label} href={href} onClick={(event) => navigate(event, href)} aria-current={pathname === href ? "page" : undefined} className={styles.navLink}>{label}</Link>
          ))}
          <Link href="/sarsip#campaign" onClick={(event) => navigate(event, "/sarsip#campaign")} className={styles.navDonate}>Donasi sekarang</Link>
        </nav>
      </div>
    </header>
  );
}
