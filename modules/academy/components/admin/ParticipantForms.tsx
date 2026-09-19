"use client";
import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import type { ActionState } from "../../api/actions";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;
export function SyncCompletionForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return <form action={formAction} className="space-y-3">
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Menghitung…" : "Hitung ulang & simpan catatan kelulusan"}</Button>
  </form>;
}

export function CertificateForm({ action, initial }: { action: Action; initial: string | null }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [url, setUrl] = useState(initial ?? "");
  const id = useId();
  return <form action={formAction} className="space-y-4">
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    <FormField label="URL sertifikat dari pengelola" htmlFor={id} hint="HTTPS atau path lokal. Kosongkan untuk menghapus tautan; kelulusan tetap dihitung dari progres peserta.">
      <Input id={id} name="certificateUrl" value={url} onChange={event => setUrl(event.target.value)} maxLength={2048} />
    </FormField>
    <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Hitung ulang & simpan sertifikat"}</Button>
  </form>;
}

export function MaintenanceForm({ action, initial }: { action: Action; initial: boolean }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [checked, setChecked] = useState(initial);
  return <form action={formAction} className="space-y-4">
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    <label className="flex items-center gap-3 text-foreground"><input type="checkbox" name="maintenance" checked={checked} onChange={event => setChecked(event.target.checked)} />Aktifkan mode pemeliharaan</label>
    <p className="max-w-2xl text-sm leading-6 text-foreground/60">Mode pemeliharaan menutup akses publik dan peserta, termasuk pengerjaan kuis. Waktu kuis yang sudah berjalan tetap dihitung. Admin tetap dapat mengelola modul.</p>
    <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan pengaturan"}</Button>
  </form>;
}
