"use client";
import { useEffect } from "react";
export function SectionScroll() {
  useEffect(() => {
    function scroll(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!link || !link.closest("[data-teknisi-site]") || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      let id: string;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      const menu = link.closest("details");
      if (menu) menu.open = false;
      const header = document.querySelector<HTMLElement>("[data-teknisi-site] > header");
      const offset = (header?.getBoundingClientRect().height ?? 64) + 20;
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    document.addEventListener("click", scroll, true);
    return () => document.removeEventListener("click", scroll, true);
  }, []);
  return null;
}
