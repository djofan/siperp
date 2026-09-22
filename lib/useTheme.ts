"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sip-admin-theme";

export type Theme = "light" | "dark";

export function useTheme() {
  // Selalu mulai dari "light" di render pertama (sama persis dengan SSR) supaya
  // tidak hydration-mismatch — preferensi tersimpan baru dibaca setelah mount.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let timeoutId: number | undefined;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "dark") {
        timeoutId = window.setTimeout(() => setTheme("dark"), 0);
      }
    } catch {
      // localStorage tidak tersedia (mode privat dsb) — tetap pakai default "light".
    }

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage tidak tersedia — tema tetap jalan untuk sesi ini saja.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
