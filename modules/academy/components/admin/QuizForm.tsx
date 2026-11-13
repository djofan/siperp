"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { Button } from "@/modules/academy/components/ui/ButtonCompat";
import { FormField, Input, Select } from "@/modules/academy/components/ui/FieldCompat";
import { panelClasses } from "@/components/ui/panel";
import type { ActionState } from "../../api/actions";

import { QuestionFields, type QuestionValues } from "./QuestionForm";
import { ExamDurationField } from "./ExamDurationField";
import { ChapterSelect } from "../ChapterSelect";

type Values = {
  title: string; description: string; passingScore: number | string; timeLimitMinutes: number | string;
  quizDate: string; isPublished: boolean; isActive: boolean; allowRetake: boolean;
  kind?: string; closesAt?: string;
  releaseDay?: number;
};

export function QuizForm({ action, initial, creating = false, chapterField, chapters, questionCount, scopeLabel, withQuestions = false, questions }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>; initial?: Values; creating?: boolean; chapterField?: ReactNode; withQuestions?: boolean; questions?: QuestionValues[];
  questionCount?: number; scopeLabel?: string;
  chapters?: { id: string; title: string; course: { id: string; title: string } }[];
}) {
  const [review, setReview] = useState<Record<string, string> | null>(null);
  const [state, formAction, pending] = useActionState(async (previous: ActionState, form: FormData) => {
    const activate = form.get("intent") === "activate";
    form.set("isActive", activate ? "on" : "");
    form.set("isPublished", activate ? "on" : "");
    const result = await action(previous, form);
    setReview(null);
    return result;
  }, { error: "" });
  const [values, setValues] = useState<Values>(initial ?? {
    title: "", description: "", passingScore: 70, timeLimitMinutes: "", quizDate: "", isPublished: false, isActive: false, allowRetake: false,
  });
  const [questionRows, setQuestionRows] = useState(() => (questions?.length ? questions : [undefined]).map((initial, index) => ({ key: index, initial })));
  const [nextQuestionKey, setNextQuestionKey] = useState(questionRows.length);
  const prefix = useId();
  return <form action={formAction} onSubmit={event => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value !== "activate" || review) return;
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const selectedText = (name: string) => {
      const input = form.elements.namedItem(name);
      return input instanceof HTMLSelectElement ? input.selectedOptions[0]?.text ?? "" : "";
    };
    setReview({
      title: String(fields.get("title") ?? ""), kind: selectedText("kind"),
      scope: scopeLabel ? ((values.kind ?? "DAILY") === "DAILY" ? scopeLabel : scopeLabel.split(" - ")[0] + " - Semua bab") : [selectedText("cohortId") || selectedText("courseId"), selectedText("chapterId")].filter(Boolean).join(" - "),
      duration: String(fields.get("timeLimitMinutes") ?? ""),
      start: String(fields.get("quizDate") ?? "").replace("T", " ") || "Segera setelah aktif (mengikuti jadwal angkatan)",
      close: String(fields.get("closesAt") ?? "").replace("T", " ") || "Tanpa batas tutup; pembahasan tetap terkunci",
    });
  }} className={panelClasses("space-y-5 p-5 sm:p-6")}>
    {!chapters && chapterField}
    <input type="hidden" name="passingScore" value={values.passingScore} />
    {state.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
    <label className="block text-sm">Jenis evaluasi<select name="kind" value={values.kind ?? "DAILY"} onChange={event => setValues({ ...values, kind: event.target.value })} className="mt-2 w-full rounded-xl border border-border p-3"><option value="DAILY">Harian</option><option value="WEEKLY">Mingguan</option><option value="FINAL">Evaluasi akhir</option></select></label>
    {chapters && <ChapterSelect chapters={chapters} requireChapter={(values.kind ?? "DAILY") === "DAILY"}/>}
    {chapters && values.kind && values.kind !== "DAILY" && <p className="text-sm text-foreground/60">Ujian ini berlaku untuk angkatan yang dipilih, tanpa memilih bab.</p>}
    <FormField label="Judul ujian *" htmlFor={prefix + "-title"}><Input id={prefix + "-title"} name="title" required maxLength={191} value={values.title} onChange={event => setValues({ ...values, title: event.target.value })} /></FormField>
    <input type="hidden" name="releaseDay" value={initial?.releaseDay ?? 1} />
    <input type="hidden" name="description" value={values.description} />
    <ExamDurationField initialMinutes={initial?.timeLimitMinutes}/>
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
    <FormField label="Status publikasi" htmlFor={prefix + "-publication"} hint="Draft menyembunyikan ujian dari peserta. Publikasi diperiksa kembali sebelum ujian diaktifkan.">
      <Select id={prefix + "-publication"} value={values.isActive ? "on" : ""} disabled={creating && !withQuestions} onChange={event => setValues({ ...values, isActive: event.target.value === "on", isPublished: event.target.value === "on" })}>
        <option value="">Draft</option>
        <option value="on">Terpublikasi</option>
      </Select>
    </FormField>
    <p className="text-sm text-foreground/60">Simpan draft untuk menyiapkan soal. Aktifkan ujian setelah soal dan jadwal sudah benar.</p>
    {state.message && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{state.message}</p>}
    {(creating && !withQuestions || questionCount === 0) && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ujian belum memiliki soal. Simpan draft, buka Kelola soal, lalu tambahkan soal dan jawaban benar sebelum mengaktifkan.</p>}
    <div className="flex flex-wrap gap-3">
      <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>{pending ? "Menyimpan..." : initial?.isActive ? "Nonaktifkan & simpan draft" : "Simpan draft"}</Button>
      <Button type="submit" name="intent" value={values.isActive ? "activate" : "draft"} disabled={pending || (values.isActive && ((creating && !withQuestions) || questionCount === 0))}>{values.isActive ? "Periksa & aktifkan ujian" : "Simpan perubahan"}</Button>
    </div>
    {review && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <section onKeyDown={event => {
        if (event.key === "Escape" && !pending) { event.preventDefault(); setReview(null); }
        if (event.key === "Tab") {
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget.querySelector("h2"))) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }} role="dialog" aria-modal="true" aria-labelledby={prefix + "-review"} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={prefix + "-review"} className="text-lg font-semibold" tabIndex={-1} ref={element => element?.focus()}>Periksa sebelum mengaktifkan</h2>
        <p className="mt-2 text-sm text-gray-600">Peserta angkatan tujuan dapat mengerjakan ujian ini sesuai jadwal setelah diaktifkan.</p>
        <dl className="my-5 space-y-3 text-sm">{[
          ["Ujian", review.title], ["Angkatan / bab", review.scope || "Sesuai angkatan yang dipilih"],
          ["Jenis", review.kind], ["Jumlah soal", String(withQuestions ? questionRows.length : questionCount ?? "Sesuai soal tersimpan")],
          ["Durasi", review.duration + " menit"], ["Mulai (WIB)", review.start], ["Batas pengerjaan (WIB)", review.close],
        ].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>
        <div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={pending} onClick={() => setReview(null)}>Kembali periksa</Button><Button type="submit" name="intent" value="activate" disabled={pending}>{pending ? "Mengaktifkan..." : "Ya, aktifkan ujian"}</Button></div>
      </section>
    </div>}
  </form>;
}
