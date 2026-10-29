"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { Button } from "@/modules/academy/components/ui/ButtonCompat";
import { FormField, Input } from "@/modules/academy/components/ui/FieldCompat";
import { panelClasses } from "@/components/ui/panel";
import type { ActionState } from "../../api/actions";

import { QuestionFields, type QuestionValues } from "./QuestionForm";

type Values = {
  title: string; description: string; passingScore: number | string; timeLimitMinutes: number | string;
  quizDate: string; isPublished: boolean; isActive: boolean; allowRetake: boolean;
  kind?: string; closesAt?: string;
  releaseDay?: number;
};

export function QuizForm({ action, initial, creating = false, chapterField, withQuestions = false, questions }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>; initial?: Values; creating?: boolean; chapterField?: ReactNode; withQuestions?: boolean; questions?: QuestionValues[];
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [values, setValues] = useState<Values>(initial ?? {
    title: "", description: "", passingScore: 70, timeLimitMinutes: "", quizDate: "", isPublished: false, isActive: false, allowRetake: false,
  });
  const [questionRows, setQuestionRows] = useState(() => (questions?.length ? questions : [undefined]).map((initial, index) => ({ key: index, initial })));
  const [nextQuestionKey, setNextQuestionKey] = useState(questionRows.length);
  const prefix = useId();
  return <form action={formAction} className={panelClasses("space-y-5 p-5 sm:p-6")}>
    {chapterField}
    <input type="hidden" name="passingScore" value={values.passingScore} />
    {state.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
    <label className="block text-sm">Jenis evaluasi<select name="kind" value={values.kind ?? "DAILY"} onChange={event => setValues({ ...values, kind: event.target.value })} className="mt-2 w-full rounded-xl border border-border p-3"><option value="DAILY">Harian</option><option value="WEEKLY">Mingguan</option><option value="FINAL">Evaluasi akhir</option></select></label>
    <FormField label="Judul ujian *" htmlFor={prefix + "-title"}><Input id={prefix + "-title"} name="title" required maxLength={191} value={values.title} onChange={event => setValues({ ...values, title: event.target.value })} /></FormField>
    <input type="hidden" name="releaseDay" value={initial?.releaseDay ?? 1} />
    <input type="hidden" name="description" value={values.description} />
    <FormField label="Durasi" htmlFor={prefix + "-duration"}><Input id={prefix + "-duration"} name="timeLimitMinutes" type="number" min={1} max={1440} step={1} required value={values.timeLimitMinutes} onChange={event => setValues({ ...values, timeLimitMinutes: event.target.value })} /></FormField>
    <div className="grid gap-5 md:grid-cols-2">
    <FormField label="Mulai tersedia (WIB)" htmlFor={prefix + "-date"}>
      <Input id={prefix + "-date"} name="quizDate" type="datetime-local" min="1000-01-01T00:00" max="9999-12-31T23:59" value={values.quizDate} onChange={event => setValues({ ...values, quizDate: event.target.value })} />
    </FormField>
    <FormField label="Batas pengerjaan (WIB)" htmlFor={prefix + "-close"}><Input id={prefix + "-close"} name="closesAt" type="datetime-local" value={values.closesAt ?? ""} onChange={event => setValues({ ...values, closesAt: event.target.value })} /></FormField>
    </div>
    {withQuestions && <section className="space-y-5 border-t border-gray-100 pt-5"><h2 className="font-semibold">Pertanyaan dan jawaban</h2>
      {questionRows.map((row, index) => <section key={row.key} className="space-y-4 rounded-xl border border-gray-200 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Pertanyaan {index + 1}</h3><Button type="button" variant="secondary" size="sm" disabled={pending || questionRows.length <= 1} onClick={() => setQuestionRows(questionRows.filter(item => item.key !== row.key))}>Hapus pertanyaan</Button></div><QuestionFields initial={row.initial} pending={pending} namePrefix={`questions[${index}]`} /></section>)}
      <Button type="button" variant="secondary" disabled={pending || questionRows.length >= 100} onClick={() => { setQuestionRows([...questionRows, { key: nextQuestionKey, initial: undefined }]); setNextQuestionKey(nextQuestionKey + 1); }}>Tambah Pertanyaan</Button>
    </section>}
    <input type="hidden" name="isPublished" value={values.isActive ? "on" : ""} />
    <label className="flex items-center gap-3 text-sm text-foreground">
      <input name="isActive" type="checkbox" disabled={creating && !withQuestions} checked={values.isActive} onChange={event => setValues({ ...values, isActive: event.target.checked, isPublished: event.target.checked })} />
      Aktifkan Ujian
    </label>
    <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : creating && !withQuestions ? "Simpan draft" : "Simpan ujian"}</Button>
  </form>;
}
