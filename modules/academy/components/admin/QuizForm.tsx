"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { panelClasses } from "@/components/ui/panel";
import type { ActionState } from "../../api/actions";

type Values = {
  title: string; description: string; passingScore: number | string; timeLimitMinutes: number | string;
  quizDate: string; isPublished: boolean; isActive: boolean; allowRetake: boolean;
  kind?: string; closesAt?: string;
  releaseDay?: number;
};

export function QuizForm({ action, initial, creating = false, chapterField }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>; initial?: Values; creating?: boolean; chapterField?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [values, setValues] = useState<Values>(initial ?? {
    title: "", description: "", passingScore: 70, timeLimitMinutes: 10, quizDate: "", isPublished: false, isActive: false, allowRetake: false,
  });
  const prefix = useId();
  return <form action={formAction} className={panelClasses("space-y-5 p-5 sm:p-6")}>
    {chapterField}
    {state.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
    <label className="block text-sm">Jenis evaluasi<select name="kind" value={values.kind ?? "DAILY"} onChange={event => setValues({ ...values, kind: event.target.value })} className="mt-2 w-full rounded-xl border border-border p-3"><option value="DAILY">Harian</option><option value="WEEKLY">Mingguan</option><option value="FINAL">Ujian per bab (akhir bulan)</option></select></label>
    <FormField label="Judul kuis *" htmlFor={prefix + "-title"}><Input id={prefix + "-title"} name="title" required maxLength={191} value={values.title} onChange={event => setValues({ ...values, title: event.target.value })} /></FormField>
    <label className="block text-sm">Hari evaluasi (1–30 sejak program dimulai)<Input name="releaseDay" type="number" min={1} max={30} required defaultValue={initial?.releaseDay ?? 1} /></label>
    <FormField label="Deskripsi" htmlFor={prefix + "-description"}><textarea id={prefix + "-description"} name="description" maxLength={30000} rows={4} value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground" /></FormField>
    <div className="grid gap-5 sm:grid-cols-2">{([
      ["passingScore", "Nilai lulus (0–100)", 0, 100], ["timeLimitMinutes", "Durasi (menit, maksimal 24 jam)", 1, 1440],
    ] as const).map(([name, label, min, max]) => <FormField key={name} label={label} htmlFor={prefix + name}><Input id={prefix + name} name={name} type="number" min={min} max={max} step={1} required value={values[name]} onChange={event => setValues({ ...values, [name]: event.target.value })} /></FormField>)}</div>
    <FormField label="Mulai tersedia (WIB)" htmlFor={prefix + "-date"} hint="Kosongkan agar tersedia segera setelah dipublikasikan dan diaktifkan.">
      <Input id={prefix + "-date"} name="quizDate" type="datetime-local" min="1000-01-01T00:00" max="9999-12-31T23:59" value={values.quizDate} onChange={event => setValues({ ...values, quizDate: event.target.value })} />
    </FormField>
    <FormField label="Batas pengerjaan (WIB)" htmlFor={prefix + "-close"} hint="Atur batas tutup untuk pengingat tenggat dan pembahasan otomatis. Tanpa batas tutup, pembahasan belum dapat dibuka."><Input id={prefix + "-close"} name="closesAt" type="datetime-local" value={values.closesAt ?? ""} onChange={event => setValues({ ...values, closesAt: event.target.value })} /></FormField>
    {(["isPublished", "isActive", "allowRetake"] as const).map(name => <label key={name} className="flex items-center gap-3 text-sm text-foreground">
      <input name={name} type="checkbox" disabled={creating && name !== "allowRetake"} checked={values[name]} onChange={event => setValues({ ...values, [name]: event.target.checked })} />
      {name === "isPublished" ? "Publikasikan kuis" : name === "isActive" ? "Aktifkan pengerjaan kuis" : "Izinkan peserta mengulang kuis"}
    </label>)}
    <p className="text-sm leading-6 text-foreground/60">{creating ? "Simpan draft terlebih dahulu, kemudian tambahkan pertanyaan sebelum publikasi." : "Kuis dapat dikerjakan ketika program dan bab juga terpublikasi. Perubahan pertanyaan, nilai lulus, dan durasi hanya berlaku untuk percobaan baru. Menonaktifkan kuis menghentikan pengerjaan sementara."}</p>
    <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : creating ? "Simpan draft" : "Simpan kuis"}</Button>
  </form>;
}
