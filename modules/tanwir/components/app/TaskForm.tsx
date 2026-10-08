"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/modules/tanwir/api/actions/state";
import type { QuizOption, TaskType } from "@/modules/tanwir/api/policy";
import { Icon, type IconName } from "@/modules/tanwir/components/icons";
import { Field, Notice, buttonClass, inputClass, textareaClass } from "@/modules/tanwir/components/ui";

export interface QuestionDraft {
  key: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: QuizOption | "";
}

export interface TaskFormValues {
  title: string;
  description: string;
  type: TaskType;
  deadline: string; // nilai datetime-local (WIB)
  questions: QuestionDraft[];
}

const TYPES: { value: TaskType; label: string; hint: string; icon: IconName }[] = [
  { value: "voice_note", label: "Voice note", hint: "Rekaman suara", icon: "mic" },
  { value: "video", label: "Video", hint: "Rekaman video", icon: "video" },
  { value: "quiz", label: "Kuis", hint: "Pilihan ganda, dinilai otomatis", icon: "quiz" },
];

let counter = 0;
const newQuestion = (): QuestionDraft => ({ key: `q${Date.now()}${counter++}`, question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "" });

export function TaskForm({
  action,
  initial,
  minDeadline,
  questionsLocked = false,
  typeLocked = false,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial?: TaskFormValues;
  minDeadline: string;
  questionsLocked?: boolean;
  typeLocked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [type, setType] = useState<TaskType>(initial?.type ?? "voice_note");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => (initial?.questions.length ? initial.questions : [newQuestion()]));

  function update(key: string, patch: Partial<QuestionDraft>) {
    setQuestions((list) => list.map((question) => (question.key === key ? { ...question, ...patch } : question)));
  }
  function move(index: number, delta: number) {
    setQuestions((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Notice tone="danger">{state.error}</Notice>}

      <Field label="Judul tugas" htmlFor="task-title">
        <input id="task-title" name="title" required maxLength={191} defaultValue={initial?.title} placeholder="Contoh: Setoran Surah Al-Mulk ayat 1–10" className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tipe tugas</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl p-3.5 ring-1 transition-colors",
                type === option.value ? "bg-tanwir-primary-soft ring-tanwir-primary" : "ring-tanwir-line hover:bg-tanwir-paper",
                typeLocked && type !== option.value && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={type === option.value}
                disabled={typeLocked && type !== option.value}
                onChange={() => setType(option.value)}
                className="sr-only"
              />
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", type === option.value ? "bg-tanwir-primary text-white" : "bg-tanwir-paper text-tanwir-muted")}>
                <Icon name={option.icon} className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-tanwir-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {typeLocked && <p className="mt-2 text-xs text-tanwir-muted">Tipe tidak bisa diubah karena sudah ada peserta yang mengumpulkan.</p>}
      </fieldset>

      <Field label="Deskripsi / perintah" htmlFor="task-description">
        <textarea id="task-description" name="description" required rows={5} maxLength={10000} defaultValue={initial?.description} className={textareaClass} />
      </Field>

      <Field label="Tenggat (WIB)" htmlFor="task-deadline" hint="Setelah lewat, tugas terkunci. Anda bisa memperpanjang tenggat dari halaman hasil tugas.">
        <input id="task-deadline" name="deadline" type="datetime-local" required min={minDeadline} defaultValue={initial?.deadline} className={cn(inputClass, "sm:max-w-xs")} />
      </Field>

      {type === "quiz" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Soal kuis · {questions.length}</h2>
            {!questionsLocked && (
              <button type="button" onClick={() => setQuestions((list) => [...list, newQuestion()])} className={buttonClass("secondary", "h-9 px-3.5")}>
                <Icon name="plus" className="h-4 w-4" />
                Tambah soal
              </button>
            )}
          </div>
          {questionsLocked ? (
            <Notice tone="warning">Soal dikunci karena sudah ada peserta yang mengerjakan — supaya jawaban & nilai yang tersimpan tetap konsisten.</Notice>
          ) : (
            <>
              <input type="hidden" name="questions" value={JSON.stringify(questions)} />
              {questions.map((question, index) => (
                <div key={question.key} className="rounded-2xl bg-tanwir-paper p-4 ring-1 ring-tanwir-line sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold tabular-nums text-tanwir-muted">Soal {index + 1}</p>
                    <div className="flex gap-1">
                      <button type="button" aria-label="Naikkan" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg p-1.5 text-tanwir-muted hover:bg-tanwir-surface disabled:opacity-30">
                        <Icon name="chevronRight" className="h-4 w-4 -rotate-90" />
                      </button>
                      <button type="button" aria-label="Turunkan" disabled={index === questions.length - 1} onClick={() => move(index, 1)} className="rounded-lg p-1.5 text-tanwir-muted hover:bg-tanwir-surface disabled:opacity-30">
                        <Icon name="chevronRight" className="h-4 w-4 rotate-90" />
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus soal"
                        disabled={questions.length === 1}
                        onClick={() => setQuestions((list) => list.filter((item) => item.key !== question.key))}
                        className="rounded-lg p-1.5 text-tanwir-muted hover:bg-tanwir-danger-soft hover:text-tanwir-danger disabled:opacity-30"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    aria-label={`Pertanyaan soal ${index + 1}`}
                    placeholder="Tulis pertanyaan"
                    rows={2}
                    value={question.question}
                    onChange={(event) => update(question.key, { question: event.target.value })}
                    className={inputClass + " h-auto py-3 leading-relaxed"}
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const key = `option${letter}` as const;
                      const value = letter.toLowerCase() as QuizOption;
                      const correct = question.correctOption === value;
                      return (
                        <div key={letter} className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-pressed={correct}
                            aria-label={`Jadikan ${letter} jawaban benar`}
                            title="Tandai sebagai jawaban benar"
                            onClick={() => update(question.key, { correctOption: value })}
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                              correct ? "bg-tanwir-success text-white" : "bg-tanwir-surface text-tanwir-muted ring-1 ring-tanwir-line hover:ring-tanwir-success",
                            )}
                          >
                            {correct ? <Icon name="check" className="h-4 w-4" /> : letter}
                          </button>
                          <input
                            aria-label={`Pilihan ${letter}`}
                            placeholder={letter === "C" || letter === "D" ? `Pilihan ${letter} (opsional)` : `Pilihan ${letter}`}
                            value={question[key]}
                            onChange={(event) => update(question.key, { [key]: event.target.value })}
                            className={inputClass + " h-10"}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-tanwir-muted">{question.correctOption ? `Kunci jawaban: ${question.correctOption.toUpperCase()}` : "Klik huruf untuk menandai jawaban benar."}</p>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Menyimpan…" : initial ? "Simpan perubahan" : "Buat & kirim ke kelompok"}
        </button>
        <Link href="/tanwir/guru/tugas" className={buttonClass("secondary")}>
          Batal
        </Link>
      </div>
    </form>
  );
}
