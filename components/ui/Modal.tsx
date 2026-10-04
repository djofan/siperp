"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      className={cn(
        "fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 text-foreground shadow-xl backdrop:bg-black/40 sm:p-6",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 break-words text-lg font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/70 hover:bg-surface-muted hover:text-foreground"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
