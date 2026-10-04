"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

// Pengganti window.confirm() untuk admin SIP — dialog bawaan browser selalu putih polos
// dan tidak ikut tema gelap shell. Pemakaian:
//   const [confirm, confirmDialog] = useSipConfirm();
//   if (!(await confirm({ title: "Hapus berita?", message: "..." }))) return;
//   ...render {confirmDialog} di JSX.
export function useSipConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel = "Hapus" }: { title: string; message: string; confirmLabel?: string }) =>
      new Promise<boolean>((resolve) => setRequest({ title, message, confirmLabel, resolve })),
    []
  );

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  const dialog = request ? <SipConfirmDialog request={request} onClose={close} /> : null;
  return [confirm, dialog] as const;
}

function SipConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      onClick={(e) => {
        // klik di backdrop (di luar kotak dialog) = batal
        if (e.target === e.currentTarget) onClose(false);
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-[#141812] p-0 text-white shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6h12z" />
          </svg>
        </span>
        <h2 className="mt-4 text-base font-bold">{request.title}</h2>
        <p className="mt-1.5 text-sm text-white/60">{request.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => onClose(false)}
            className="rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white/80 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sip-lime/60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-300"
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
