"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/modules/tanwir/api/actions/state";
import { Notice } from "@/modules/tanwir/components/ui";
import { optionsOf, type QuizQuestionView } from "./quiz-options";

export function QuizForm({
  questions,
  action,
}: {
  questions: QuizQuestionView[];
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const answered = Object.keys(answers).length;
  const complete = answered === questions.length;

  return (
    <form action={formAction} className="quiz-form space-y-4">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {Object.entries(answers).map(([id, answer]) => <input key={id} type="hidden" name={`q_${id}`} value={answer} />)}
      <div className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tanwir-line"><div className="h-full bg-tanwir-primary" style={{ width: `${questions.length ? answered / questions.length * 100 : 0}%` }} /></div><span className="text-xs tabular-nums text-tanwir-muted">{answered}/{questions.length} terjawab</span></div>
      <nav aria-label="Nomor soal" className="flex flex-wrap gap-2">{questions.map((question,index) => <button key={question.id} type="button" onClick={() => setCurrentQuestion(index)} aria-label={`Soal ${index + 1}${answers[question.id] ? ", terjawab" : ""}`} aria-current={currentQuestion === index ? "step" : undefined} className={cn("h-11 w-11 rounded-lg border text-sm", currentQuestion === index ? "border-tanwir-primary bg-tanwir-primary text-white" : answers[question.id] ? "border-tanwir-line bg-tanwir-primary-soft text-tanwir-primary" : "border-tanwir-line bg-white")}>{index + 1}</button>)}</nav>
      {questions.slice(currentQuestion, currentQuestion + 1).map((question) => (
        <fieldset key={question.id} className="rounded-2xl bg-tanwir-surface p-5 ring-1 ring-tanwir-line sm:p-6">
          <legend className="sr-only">Soal {currentQuestion + 1}</legend>
          <p className="text-xs font-medium tabular-nums text-tanwir-muted">
            Soal {currentQuestion + 1} dari {questions.length}
          </p>
          <p className="mt-2 whitespace-pre-line font-medium leading-relaxed">{question.question}</p>
          <div className="mt-4 grid gap-2">
            {optionsOf(question).map(([key, label]) => {
              const selected = answers[question.id] === key;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 transition-colors",
                    selected ? "bg-tanwir-primary-soft ring-tanwir-primary" : "ring-tanwir-line hover:bg-tanwir-paper",
                  )}
                >
                  <input
                    type="radio"
                    name={`answer_${question.id}`}
                    value={key}
                    checked={selected}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: key }))}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
                      selected ? "bg-tanwir-primary text-white" : "bg-tanwir-paper text-tanwir-muted ring-1 ring-tanwir-line",
                    )}
                  >
                    {key}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="sticky bottom-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tanwir-line bg-white px-5 py-4 lg:bottom-4">
        <button type="button" disabled={pending || currentQuestion === 0} onClick={() => setCurrentQuestion(index => index - 1)} className="h-11 px-4 text-sm text-tanwir-muted disabled:opacity-40">Sebelumnya</button>
        {currentQuestion < questions.length - 1 && <button type="button" disabled={pending} onClick={() => setCurrentQuestion(index => index + 1)} className="h-11 bg-tanwir-primary px-5 text-sm text-white">Lanjut</button>}
        <button
          type="submit"
          disabled={!complete || pending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-tanwir-primary px-5 text-sm font-medium text-white transition-colors hover:bg-tanwir-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Mengirim…" : "Kumpulkan kuis"}
        </button>
      </div>
      <p className="text-xs text-tanwir-muted">Jawaban tersimpan selama halaman ini terbuka, belum dikirim ke server. Kuis hanya bisa dikumpulkan sekali.</p>
    </form>
  );
}
