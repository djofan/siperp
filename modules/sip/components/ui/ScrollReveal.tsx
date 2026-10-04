"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Animasi muncul halus (fade + naik sedikit) untuk elemen ber-atribut `data-reveal` di
// halaman publik SIP. Konten baru disembunyikan SETELAH script ini jalan (class
// `sip-reveal-ready` di root), jadi kalau JS gagal/lambat konten tetap tampil normal.
// Sengaja cek posisi saat scroll (bukan IntersectionObserver) supaya elemen yang
// "terlompati" lewat klik menu anchor juga ikut tampil, tidak tertinggal tersembunyi.
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector(".sip-public");
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const check = () => {
      frame = 0;
      const pending = root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)");
      const limit = window.innerHeight * 0.92;
      for (const el of pending) {
        if (el.getBoundingClientRect().top < limit) el.classList.add("is-revealed");
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };

    // Tandai yang sudah kelihatan dulu, baru aktifkan mode tersembunyi — hero tidak berkedip.
    check();
    root.classList.add("sip-reveal-ready");
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", check);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", check);
    };
  }, [pathname]);

  return null;
}
