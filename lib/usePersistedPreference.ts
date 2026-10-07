"use client";

import { useCallback, useSyncExternalStore } from "react";

// Preferensi tampilan per-browser (mis. mode list/grid di tabel admin) — bukan data
// bisnis, jadi cukup di localStorage supaya tetap bertahan saat halaman di-refresh.
const CHANGE_EVENT = "persisted-preference-change";

// Cadangan kalau localStorage tidak tersedia (mode privat dsb) — pilihan tetap
// berlaku selama tab terbuka walau tidak bertahan setelah refresh.
const memoryStore = new Map<string, string>();

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

// `allowed` bisa daftar nilai tetap, atau fungsi validasi untuk nilai yang bentuknya
// bebas (tanggal, nomor halaman) — nilai tersimpan yang tidak valid dibuang ke fallback.
export function usePersistedPreference<T extends string>(
  key: string,
  allowed: readonly T[] | ((value: string) => value is T),
  fallback: T
): [T, (value: T) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      function handleStorage(event: StorageEvent) {
        if (event.key === key) onChange();
      }
      function handleLocalChange(event: Event) {
        if ((event as CustomEvent<string>).detail === key) onChange();
      }
      window.addEventListener("storage", handleStorage);
      window.addEventListener(CHANGE_EVENT, handleLocalChange);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(CHANGE_EVENT, handleLocalChange);
      };
    },
    [key]
  );

  // Server snapshot selalu null → render SSR & hydration pakai fallback, lalu
  // nilai tersimpan langsung dipakai setelah hydration tanpa mismatch.
  const stored = useSyncExternalStore(subscribe, () => readPreference(key), () => null);
  const isAllowed =
    typeof allowed === "function" ? allowed : (v: string): v is T => (allowed as readonly string[]).includes(v);
  const value = stored !== null && isAllowed(stored) ? stored : fallback;

  const setValue = useCallback(
    (next: T) => {
      memoryStore.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // localStorage tidak tersedia — tetap jalan untuk sesi ini lewat memoryStore.
      }
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
    },
    [key]
  );

  return [value, setValue];
}
