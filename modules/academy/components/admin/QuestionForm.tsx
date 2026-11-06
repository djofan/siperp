"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/modules/academy/components/ui/ButtonCompat";
import { FormField } from "@/modules/academy/components/ui/FieldCompat";
import type { ActionState } from "../../api/actions";
import type { QuizOptionInput } from "../../api/admin-quiz-validation";

export type QuestionValues = { id?: string; question: string; explanation?: string | null; order: number; type?: string; weight?: number; options: QuizOptionInput[] };

export function QuestionForm({ action, initial }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; initial?: QuestionValues }) {
 const [state, formAction, pending] = useActionState(action, { error: "" });
 return <form action={formAction} className="space-y-5">{state.error && <p role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}<QuestionFields initial={initial} pending={pending} /><Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan pertanyaan"}</Button></form>;
}
export function QuestionFields({ initial, pending = false, namePrefix }: { initial?: QuestionValues; pending?: boolean; namePrefix?: string }) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [order] = useState(String(initial?.order ?? 0));
  const [type, setType] = useState(initial?.type ?? "SINGLE");
  const [options, setOptions] = useState((initial?.options ?? [
    { id: "", label: "", isCorrect: true }, { id: "", label: "", isCorrect: false },
  ]).map((option, index) => ({ ...option, key: String(index) })));
  const [nextKey, setNextKey] = useState(options.length);
  const prefix = useId();
  const fieldName = (name: string) => namePrefix ? `${namePrefix}[${name}]` : name;
  return <div className="space-y-5">
    {namePrefix && <input type="hidden" name={fieldName("id")} value={initial?.id ?? ""} />}
    <label className="block text-sm">Jenis soal<select name={fieldName("type")} value={type} onChange={event => {
      const next = event.target.value; setType(next);
      if (next === "TRUE_FALSE") setOptions([{ id: options[0]?.id ?? "", label: "Benar", isCorrect: true, key: "0" }, { id: options[1]?.id ?? "", label: "Salah", isCorrect: false, key: "1" }]);
      else if (next !== "MULTIPLE") setOptions(options.map((option, index) => ({ ...option, isCorrect: index === 0 })));
    }} className="mt-2 w-full rounded-xl border border-border p-3"><option value="SINGLE">Pilihan ganda (satu jawaban)</option><option value="TRUE_FALSE">Benar / Salah</option><option value="MULTIPLE">Multiple choice (beberapa jawaban)</option></select></label>
    <input type="hidden" name={fieldName("weight")} value={initial?.weight ?? 1} />
    <FormField label="Pertanyaan *" htmlFor={prefix + "-question"}><textarea id={prefix + "-question"} name={fieldName("question")} required maxLength={10000} rows={4} value={question} onChange={event => setQuestion(event.target.value)} className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground" /></FormField>
    <input type="hidden" name={fieldName("order")} value={order} />
    <input type="hidden" name={fieldName("explanation")} value={initial?.explanation ?? ""} />
    <input type="hidden" name={fieldName("options")} value={JSON.stringify(options.map(({ id, label, isCorrect }) => ({ id, label, isCorrect })))} />
    <fieldset className="space-y-3"><legend className="mb-3 font-semibold text-foreground">Opsi jawaban (2–10)</legend>
      <p className="text-sm text-foreground/60">{type === "MULTIPLE" ? "Centang semua jawaban benar. Peserta memperoleh bobot penuh bila pilihannya tepat, tanpa opsi salah." : "Pilih tepat satu opsi sebagai jawaban benar."}</p>
      {options.map((option, index) => <div key={option.key} className="space-y-2 rounded-xl border border-border p-4">
        <FormField label={`Opsi ${index + 1}`} htmlFor={prefix + "-option-" + option.key}>
          <textarea id={prefix + "-option-" + option.key} required maxLength={4000} rows={2} value={option.label} onChange={event => setOptions(options.map(item => item.key === option.key ? { ...item, label: event.target.value } : item))} className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground" />
        </FormField>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-foreground"><input type={type === "MULTIPLE" ? "checkbox" : "radio"} name={fieldName("correctOption")} required={type !== "MULTIPLE"} value={option.key} checked={option.isCorrect} onChange={() => setOptions(options.map(item => type === "MULTIPLE" ? item.key === option.key ? { ...item, isCorrect: !item.isCorrect } : item : { ...item, isCorrect: item.key === option.key }))} />Jawaban benar</label>
          <Button type="button" variant="secondary" size="sm" disabled={pending || options.length <= 2 || type === "TRUE_FALSE"} onClick={() => setOptions(options.filter(item => item.key !== option.key))}>Hapus opsi {index + 1}</Button>
        </div>
      </div>)}
    </fieldset>
    <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={pending || options.length >= 10 || type === "TRUE_FALSE"} onClick={() => {
      setOptions([...options, { id: "", label: "", isCorrect: false, key: String(nextKey) }]); setNextKey(nextKey + 1);
    }}>Tambah opsi</Button></div>
  </div>;
}
