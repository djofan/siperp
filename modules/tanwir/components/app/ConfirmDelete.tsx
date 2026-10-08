"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/modules/tanwir/api/actions/state";
import { Icon } from "@/modules/tanwir/components/icons";

// Hapus dua langkah tanpa dialog browser: klik "Hapus" → muncul "Yakin? Ya / Batal".
export function ConfirmDelete({
  action,
  label = "Hapus",
  confirmText = "Hapus permanen?",
  redirectTo,
}: {
  action: () => Promise<ActionState>;
  label?: string;
  confirmText?: string;
  /** Halaman tujuan setelah terhapus (mis. dari halaman detail yang datanya ikut hilang). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-tanwir-muted hover:bg-tanwir-danger-soft hover:text-tanwir-danger"
      >
        <Icon name="trash" className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className="text-tanwir-danger">{error || confirmText}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            if (result.error) setError(result.error);
            else if (redirectTo) router.replace(redirectTo);
            else router.refresh();
          })
        }
        className="rounded-full bg-tanwir-danger px-3 py-1.5 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Menghapus…" : "Ya, hapus"}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="rounded-full px-3 py-1.5 font-medium text-tanwir-muted hover:bg-tanwir-paper">
        Batal
      </button>
    </span>
  );
}
