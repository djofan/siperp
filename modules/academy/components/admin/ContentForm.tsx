"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { panelClasses } from "@/components/ui/panel";
import type { ActionState } from "../../api/actions";

type Values = {
  title?: string; slug?: string; order?: number; isPublished?: boolean;
  description?: string | null; shortDescription?: string | null; contentSummary?: string | null;
  thumbnailUrl?: string | null; materialUrl?: string | null; videoProvider?: string; videoUrl?: string;
  fileUrl?: string; fileType?: string | null; fileSize?: number | null;
};

type Field = { name: keyof Values; label: string; required?: boolean; long?: boolean; number?: boolean; hint?: string };

export function ContentForm({ kind, action, initial = {} }: {
  kind: "course" | "chapter" | "lesson" | "attachment";
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial?: Values;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [values, setValues] = useState<Values>({ order: 0, videoProvider: "YOUTUBE", ...initial });
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
    { name: "videoUrl", label: "URL video", required: true, hint: "YouTube/Vimeo: tautan video HTTPS. Bunny: https://iframe.mediadelivery.net/embed/..." },
    { name: "contentSummary", label: "Ringkasan materi", long: true },
  );
  if (kind === "attachment") fields.push(
    { name: "fileUrl", label: "URL lampiran", required: true, hint: "URL HTTPS atau path file lokal. File disimpan di layanan penyimpanan yang digunakan pengelola." },
    { name: "fileType", label: "Tipe file", hint: "Opsional, misalnya application/pdf." },
    { name: "fileSize", label: "Ukuran file (byte)", number: true },
  );

  return <form action={formAction} className={panelClasses("space-y-5 p-5 sm:p-6")}>
    {state.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
    {kind === "lesson" && <FormField label="Provider video" htmlFor={`${prefix}-provider`}>
      <Select id={`${prefix}-provider`} name="videoProvider" value={values.videoProvider} onChange={(event) => setValues({ ...values, videoProvider: event.target.value })}>
        <option value="YOUTUBE">YouTube</option><option value="VIMEO">Vimeo</option><option value="BUNNY">Bunny</option>
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
          : <Input id={id} name={field.name} type={field.number ? "number" : "text"} min={field.number ? 0 : undefined} max={field.number ? 2147483647 : undefined} step={field.number ? 1 : undefined}
            required={field.required} maxLength={maxLength} value={value}
            onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />}
      </FormField>;
    })}
    {kind !== "attachment" && <label className="flex items-center gap-3 text-sm font-medium text-foreground">
      <input type="checkbox" name="isPublished" checked={values.isPublished ?? false} onChange={(event) => setValues({ ...values, isPublished: event.target.checked })} className="size-4 accent-accent" />
      Publikasikan {kind === "course" ? "program" : kind === "chapter" ? "bab" : "materi"}
    </label>}
    {kind !== "course" && kind !== "attachment" && <p className="text-xs text-foreground/60">Konten tampil kepada peserta hanya jika induknya juga dipublikasikan.</p>}
    <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan perubahan"}</Button>
  </form>;
}
