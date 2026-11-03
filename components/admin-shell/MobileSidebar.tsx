"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function MobileSidebar({ open, onClose, children }: {open: boolean; onClose: () => void; children: ReactNode}) {
 const ref = useRef<HTMLDialogElement>(null);
 const close = useRef(onClose);
 useEffect(() => { close.current = onClose; }, [onClose]);
 useEffect(() => {
  const dialog = ref.current;
  if (!dialog) return;
  if (open && !dialog.open) dialog.showModal();
  if (!open && dialog.open) dialog.close();
  const media = window.matchMedia("(min-width: 1024px)");
  const resize = () => { if (media.matches && dialog.open) close.current(); };
  media.addEventListener("change", resize);
  return () => media.removeEventListener("change", resize);
 }, [open]);
 return <dialog ref={ref} aria-label="Menu navigasi" onCancel={onClose} onClose={onClose}
  onClick={event => { if (event.target === event.currentTarget) onClose(); }}
  className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground backdrop:bg-black/50">
   <div className="relative h-full w-fit max-w-[calc(100vw-3rem)] overflow-y-auto overscroll-contain bg-[#0a0d08] shadow-xl">
    <button type="button" onClick={onClose} aria-label="Tutup menu" className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white">×</button>
    {children}
   </div>
 </dialog>;
}
