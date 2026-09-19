"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormField";
import type { ActionState } from "../../api/actions";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function OrderForm({ action, order, title }: { action: Action; order: number; title: string }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [value, setValue] = useState(String(order));
  return <form action={formAction} className="space-y-2">
    <div className="flex items-center gap-2"><Input name="order" aria-label={`Urutan ${title}`} type="number" min={0} max={2147483647} step={1} required value={value} onChange={(event) => setValue(event.target.value)} className="w-24" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>{pending ? "…" : "Simpan"}</Button>
    </div>
    {state.error && <p role="alert" className="max-w-xs text-xs text-danger">{state.error}</p>}
  </form>;
}

export function DeleteForm({ action, title, attachment = false, description }: { action: Action; title: string; attachment?: boolean; description?: string }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return <details className="mt-4 rounded-xl border border-danger/20 p-4 text-sm">
    <summary className="cursor-pointer font-semibold text-danger">Hapus {title}</summary>
    <form action={formAction} className="mt-4 space-y-4">
      <p className="leading-6 text-foreground/70">{description ?? (attachment ? "Tautan lampiran dihapus dari materi. File asli di layanan penyimpanan tidak ikut dihapus." : "Konten beserta turunannya akan dihapus. Konten yang memiliki peserta atau riwayat belajar tidak dapat dihapus; nonaktifkan publikasinya.")}</p>
      <label className="flex items-start gap-2 text-foreground"><input type="checkbox" name="confirm" required className="mt-1" />Saya memahami dan ingin menghapus {title}.</label>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <Button type="submit" variant="danger" disabled={pending}>{pending ? "Menghapus…" : "Hapus permanen"}</Button>
    </form>
  </details>;
}
