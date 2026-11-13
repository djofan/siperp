"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Memory only: never persist lesson drafts, exam answers or credentials. */
export function useUnsavedWork(pending = false) {
  const dirty = useRef(false);
  const revision = useRef(0);
  const owner = useRef<EventTarget | null>(null);
  const [changed, setChanged] = useState(false);
  const [offline, setOffline] = useState(false);
  const markChanged = useCallback((event?: { currentTarget?: EventTarget | null }) => { if (event?.currentTarget) owner.current = event.currentTarget; revision.current += 1; dirty.current = true; setChanged(true); }, []);
  const markSaved = useCallback((version?: number) => { if (version !== undefined && version !== revision.current) return; dirty.current = false; setChanged(false); }, []);
  useEffect(() => {
    const network = () => setOffline(!navigator.onLine);
    network();
    const unload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    const confirmLeave = (event: Event) => {
      if (!window.confirm("Perubahan belum tersimpan. Tetap tinggalkan halaman ini?")) {
        event.preventDefault(); event.stopImmediatePropagation();
      } else dirty.current = false;
    };
    const submit = (event: Event) => {
      if (dirty.current && event.target !== owner.current) confirmLeave(event);
    };
    const leave = (event: MouseEvent) => {
      if ((event.target as Element)?.closest?.("[data-academy-leave]")) { if (dirty.current) confirmLeave(event); return; }
      const anchor = (event.target as Element)?.closest?.("a[href]");
      if (!dirty.current || !(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href);
      if (destination.pathname === location.pathname && destination.search === location.search) return;
      confirmLeave(event);
    };
    window.addEventListener("online", network); window.addEventListener("offline", network);
    window.addEventListener("beforeunload", unload); document.addEventListener("click", leave, true); document.addEventListener("submit", submit, true);
    return () => {
      window.removeEventListener("online", network); window.removeEventListener("offline", network);
      window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); document.removeEventListener("submit", submit, true);
    };
  }, []);
  return { markChanged, markSaved, snapshot: () => revision.current, preventDraftReset: (event: { preventDefault(): void }) => { if (dirty.current) event.preventDefault(); }, offline, status: pending ? "Sedang mengirim ke server…" : changed ? "Belum tersimpan. Simpan sebelum meninggalkan halaman." : "" };
}
