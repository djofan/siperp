"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { panelClasses } from "@/components/ui/panel";
import type { ActionState } from "../../api/actions";

type Values = {
  title?: string; slug?: string; order?: number; isPublished?: boolean;
  description?: string | null; shortDescription?: string | null; contentSummary?: string | null;
  thumbnailUrl?: string | null; materialUrl?: string | null; videoProvider?: string; videoUrl?: string;
  fileUrl?: string; fileType?: string | null; fileSize?: number | null;
  releaseDay?: number;
};

type Field = { name: keyof Values; label: string; required?: boolean; long?: boolean; number?: boolean; hint?: string };

export function ContentForm({ kind, action, initial = {}, flat = false, contextField, uploadAudio = false, existingAudio }: {
  kind: "course" | "chapter" | "lesson" | "attachment";
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial?: Values;
  flat?: boolean;
  contextField?: ReactNode;
  uploadAudio?: boolean;
  existingAudio?: { url: string | null; title?: string };
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [values, setValues] = useState<Values>({ order: kind === "lesson" ? 1 : 0, videoProvider: "AUDIO", releaseDay: 1, ...initial });
  const prefix = useId();
  const fields: Field[] = [{ name: "title", label: "Judul", required: true }];
  if (kind !== "attachment") fields.push(
    { name: "slug", label: "Slug", required: true, hint: "Huruf kecil, angka, dan tanda hubung. Contoh: pengantar-zakat." },
    { name: "order", label: "Urutan", required: true, number: true, hint: "Angka lebih kecil ditampilkan lebih dulu. Gunakan angka berbeda untuk mengatur urutan." },
  );
  if (kind === "course" || kind === "lesson") fields.push(
    { name: "shortDescription", label: "Deskripsi singkat", long: true, required: kind === "course" },
    { name: "thumbnailUrl", label: "URL thumbnail", hint: "URL HTTPS atau path file lokal." },
  );
  if (kind === "course" || kind === "chapter") fields.push({ name: "description", label: "Deskripsi", long: true });
  if (kind === "course") fields.push({ name: "materialUrl", label: "URL bahan belajar", hint: "Hanya dapat dibuka peserta yang mengikuti program." });
  if (kind === "lesson") fields.push(
    { name: "videoUrl", label: "URL audio / materi", required: values.videoProvider !== "AUDIO", hint: "Materi boleh berisi teks, audio, atau keduanya. Gunakan URL HTTPS atau path audio lokal." },
    ...(!flat ? [{ name: "releaseDay" as const, label: "Hari rilis (1–30)", required: true, number: true, hint: "Hari pembelajaran dihitung dari tanggal mulai program." }] : []),
    { name: "contentSummary", label: "Teks materi", long: true },
  );
  if (kind === "attachment") fields.push(
    { name: "fileUrl", label: "URL lampiran", required: true, hint: "URL HTTPS atau path file lokal. File disimpan di layanan penyimpanan yang digunakan pengelola." },
    { name: "fileType", label: "Tipe file", hint: "Opsional, misalnya application/pdf." },
    { name: "fileSize", label: "Ukuran file (byte)", number: true },
  );

  if (flat && kind === "lesson") {
    const retained = new Set(["title", "order", "shortDescription"]);
    fields.splice(0, fields.length, ...fields.filter(field => retained.has(field.name)));
  }

  return <form action={formAction} className={panelClasses("space-y-5 p-5 sm:p-6")}>
    {contextField}
    {flat && <input type="hidden" name="releaseDay" value={values.releaseDay ?? 1} />}
    {state.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
    {kind === "lesson" && <FormField label="Jenis materi" htmlFor={`${prefix}-provider`}>
      <Select id={`${prefix}-provider`} name="videoProvider" value={flat ? "AUDIO" : values.videoProvider} onChange={(event) => setValues({ ...values, videoProvider: event.target.value })}>
        <option value="AUDIO">Audio</option>{!flat && <><option value="YOUTUBE">YouTube (arsip)</option><option value="VIMEO">Vimeo (arsip)</option><option value="BUNNY">Bunny (arsip)</option></>}
      </Select>
    </FormField>}
    {fields.map((field) => {
      const id = `${prefix}-${field.name}`;
      const value = String(values[field.name] ?? "");
      const maxLength = field.name === "slug" ? 160 : field.long ? (field.name === "shortDescription" ? 2000 : 30_000) : field.name.endsWith("Url") ? 2048 : 191;
      return <FormField key={field.name} label={`${field.label}${field.required ? " *" : ""}`} htmlFor={id} hint={field.hint}>
        {field.long ? <textarea id={id} name={field.name} required={field.required} maxLength={maxLength} rows={5}
          value={value} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
          className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
          : <Input id={id} name={field.name} type={field.number ? "number" : "text"} min={field.number ? (field.name === "order" && kind === "lesson" ? 1 : 0) : undefined} max={field.number ? 2147483647 : undefined} step={field.number ? 1 : undefined}
            required={field.required} maxLength={maxLength} value={value}
            onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />}
      </FormField>;
    })}
    {uploadAudio && <FormField label="Upload audio *" htmlFor={`${prefix}-audio`} hint="MP3, WAV, OGG, atau M4A, maksimal 50 MB."><input id={`${prefix}-audio`} name="file" type="file" required accept=".mp3,.wav,.ogg,.m4a" className="block w-full rounded-xl border border-border p-3 text-sm" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.setCustomValidity(file && file.size > 50 * 1024 * 1024 ? "Ukuran audio maksimal 50 MB." : ""); }} /></FormField>}
    {flat && kind === "lesson" && !uploadAudio && <FormField label="Status" htmlFor={`${prefix}-status`}>
      <Select id={`${prefix}-status`} name="isPublished" value={values.isPublished ? "1" : "0"} onChange={event => setValues({ ...values, isPublished: event.target.value === "1" })}>
        <option value="0">Draft</option>
        <option value="1">Terpublikasi</option>
      </Select>
    </FormField>}
    {(!flat || uploadAudio) && kind !== "attachment" && <label className="flex items-center gap-3 text-sm font-medium text-foreground">
      <input type="checkbox" name="isPublished" checked={values.isPublished ?? false} onChange={(event) => setValues({ ...values, isPublished: event.target.checked })} className="size-4 accent-accent" />
      Publikasikan {kind === "course" ? "program" : kind === "chapter" ? "bab" : "materi"}
    </label>}
    {!flat && kind !== "course" && kind !== "attachment" && <p className="text-xs text-foreground/60">Konten tampil kepada peserta hanya jika induknya juga dipublikasikan.</p>}
    {existingAudio && <section className="space-y-3 border-t border-gray-100 pt-5">
      <h2 className="font-semibold">File audio</h2>
      {existingAudio.url ? <>{existingAudio.title && <p className="text-sm text-gray-500">{existingAudio.title}</p>}<audio controls preload="metadata" src={existingAudio.url} className="w-full" aria-label={values.title ?? "Audio materi"} /></> : <p className="text-sm text-gray-500">Belum ada audio.</p>}
      <FormField label={existingAudio.url ? "Ganti file audio" : "Upload file audio"} htmlFor={`${prefix}-edit-audio`} hint="MP3, WAV, OGG, atau M4A, maksimal 50 MB. Kosongkan jika tidak ingin mengganti audio.">
        <input id={`${prefix}-edit-audio`} name="file" type="file" accept=".mp3,.wav,.ogg,.m4a" className="block w-full rounded-xl border border-border p-3 text-sm" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.setCustomValidity(file && file.size > 50 * 1024 * 1024 ? "Ukuran audio maksimal 50 MB." : ""); }} />
      </FormField>
    </section>}
    <Button type="submit" disabled={pending}>{pending ? uploadAudio ? "Mengunggah & menyimpan…" : "Menyimpan…" : uploadAudio ? "Simpan materi" : "Simpan perubahan"}</Button>
  </form>;
}
