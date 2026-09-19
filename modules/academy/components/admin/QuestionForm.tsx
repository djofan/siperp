"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import type { ActionState } from "../../api/actions";
import type { QuizOptionInput } from "../../api/admin-quiz-validation";

export function QuestionForm({ action, initial }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial?: { question: string; order: number; options: QuizOptionInput[] };
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [order, setOrder] = useState(String(initial?.order ?? 0));
  const [options, setOptions] = useState((initial?.options ?? [
    { id: "", label: "", isCorrect: true }, { id: "", label: "", isCorrect: false },
  ]).map((option, index) => ({ ...option, key: String(index) })));
  const [nextKey, setNextKey] = useState(options.length);
  const prefix = useId();
  return <form action={formAction} className="space-y-5">
    {state.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
    <FormField label="Pertanyaan *" htmlFor={prefix + "-question"}><textarea id={prefix + "-question"} name="question" required maxLength={10000} rows={4} value={question} onChange={event => setQuestion(event.target.value)} className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground" /></FormField>
    <FormField label="Urutan" htmlFor={prefix + "-order"} hint="Angka lebih kecil ditampilkan lebih awal."><Input id={prefix + "-order"} name="order" type="number" min={0} max={2147483647} step={1} required value={order} onChange={event => setOrder(event.target.value)} /></FormField>
    <input type="hidden" name="options" value={JSON.stringify(options.map(({ id, label, isCorrect }) => ({ id, label, isCorrect })))} />
    <fieldset className="space-y-3"><legend className="mb-3 font-semibold text-foreground">Opsi jawaban (2–10)</legend>
      <p className="text-sm text-foreground/60">Pilih tepat satu opsi sebagai jawaban benar.</p>
      {options.map((option, index) => <div key={option.key} className="space-y-2 rounded-xl border border-border p-4">
        <FormField label={`Opsi ${index + 1}`} htmlFor={prefix + "-option-" + option.key}>
          <textarea id={prefix + "-option-" + option.key} required maxLength={4000} rows={2} value={option.label} onChange={event => setOptions(options.map(item => item.key === option.key ? { ...item, label: event.target.value } : item))} className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground" />
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-foreground"><input type="radio" name="correctOption" required value={option.key} checked={option.isCorrect} onChange={() => setOptions(options.map(item => ({ ...item, isCorrect: item.key === option.key })))} />Jawaban benar</label>
          <Button type="button" variant="secondary" size="sm" disabled={pending || options.length <= 2} onClick={() => setOptions(options.filter(item => item.key !== option.key))}>Hapus opsi {index + 1}</Button>
        </div>
      </div>)}
    </fieldset>
    <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={pending || options.length >= 10} onClick={() => {
      setOptions([...options, { id: "", label: "", isCorrect: false, key: String(nextKey) }]); setNextKey(nextKey + 1);
    }}>Tambah opsi</Button><Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan pertanyaan"}</Button></div>
  </form>;
}
