"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import type { ActionState } from "../../api/actions";
import type { QuizOptionInput } from "../../api/admin-quiz-validation";

export function QuestionForm({ action, initial }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial?: { question: string; explanation?: string | null; order: number; type?: string; weight?: number; options: QuizOptionInput[] };
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [order, setOrder] = useState(String(initial?.order ?? 0));
  const [type, setType] = useState(initial?.type ?? "SINGLE");
  const [options, setOptions] = useState((initial?.options ?? [
    { id: "", label: "", isCorrect: true }, { id: "", label: "", isCorrect: false },
  ]).map((option, index) => ({ ...option, key: String(index) })));
  const [nextKey, setNextKey] = useState(options.length);
  const prefix = useId();
  return <form action={formAction} className="space-y-5">
    {state.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
    {state.message && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{state.message}</p>}
    <label className="block text-sm">Jenis soal<select name="type" value={type} onChange={event => {
      const next = event.target.value; setType(next);
      if (next === "TRUE_FALSE") setOptions([{ id: options[0]?.id ?? "", label: "Benar", isCorrect: true, key: "0" }, { id: options[1]?.id ?? "", label: "Salah", isCorrect: false, key: "1" }]);
      else if (next !== "MULTIPLE") setOptions(options.map((option, index) => ({ ...option, isCorrect: index === 0 })));
    }} className="mt-2 w-full rounded-xl border border-border p-3"><option value="SINGLE">Pilihan ganda (satu jawaban)</option><option value="TRUE_FALSE">Benar / Salah</option><option value="MULTIPLE">Multiple choice (beberapa jawaban)</option></select></label>
    <label className="block text-sm">Bobot soal (1–100)<Input name="weight" type="number" min={1} max={100} required defaultValue={initial?.weight ?? 1} /></label>
    <FormField label="Pertanyaan *" htmlFor={prefix + "-question"}><textarea id={prefix + "-question"} name="question" required maxLength={10000} rows={4} value={question} onChange={event => setQuestion(event.target.value)} className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground" /></FormField>
    <FormField label="Urutan" htmlFor={prefix + "-order"} hint="Angka lebih kecil ditampilkan lebih awal."><Input id={prefix + "-order"} name="order" type="number" min={0} max={2147483647} step={1} required value={order} onChange={event => setOrder(event.target.value)} /></FormField>
    <label className="block text-sm">Pembahasan setelah ujian ditutup<textarea name="explanation" maxLength={10000} rows={4} defaultValue={initial?.explanation ?? ""} className="mt-2 w-full rounded-xl border border-border p-3" placeholder="Jelaskan alasan jawaban benar…" /></label>
    <input type="hidden" name="options" value={JSON.stringify(options.map(({ id, label, isCorrect }) => ({ id, label, isCorrect })))} />
    <fieldset className="space-y-3"><legend className="mb-3 font-semibold text-foreground">Opsi jawaban (2–10)</legend>
      <p className="text-sm text-foreground/60">{type === "MULTIPLE" ? "Centang semua jawaban benar. Peserta memperoleh bobot penuh bila pilihannya tepat, tanpa opsi salah." : "Pilih tepat satu opsi sebagai jawaban benar."}</p>
      {options.map((option, index) => <div key={option.key} className="space-y-2 rounded-xl border border-border p-4">
        <FormField label={`Opsi ${index + 1}`} htmlFor={prefix + "-option-" + option.key}>
          <textarea id={prefix + "-option-" + option.key} required maxLength={4000} rows={2} value={option.label} onChange={event => setOptions(options.map(item => item.key === option.key ? { ...item, label: event.target.value } : item))} className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground" />
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-foreground"><input type={type === "MULTIPLE" ? "checkbox" : "radio"} name="correctOption" required={type !== "MULTIPLE"} value={option.key} checked={option.isCorrect} onChange={() => setOptions(options.map(item => type === "MULTIPLE" ? item.key === option.key ? { ...item, isCorrect: !item.isCorrect } : item : { ...item, isCorrect: item.key === option.key }))} />Jawaban benar</label>
          <Button type="button" variant="secondary" size="sm" disabled={pending || options.length <= 2 || type === "TRUE_FALSE"} onClick={() => setOptions(options.filter(item => item.key !== option.key))}>Hapus opsi {index + 1}</Button>
        </div>
      </div>)}
    </fieldset>
    <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={pending || options.length >= 10 || type === "TRUE_FALSE"} onClick={() => {
      setOptions([...options, { id: "", label: "", isCorrect: false, key: String(nextKey) }]); setNextKey(nextKey + 1);
    }}>Tambah opsi</Button><Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan pertanyaan"}</Button></div>
  </form>;
}
