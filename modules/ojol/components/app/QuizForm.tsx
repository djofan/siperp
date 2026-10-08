"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/modules/ojol/api/actions/state";
import { Notice } from "@/modules/ojol/components/ui";
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
  const answered = Object.keys(answers).length;
  const complete = answered === questions.length;

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {questions.map((question, index) => (
        <fieldset key={question.id} className="rounded-2xl bg-ojol-surface p-5 ring-1 ring-ojol-line sm:p-6">
          <legend className="sr-only">Soal {index + 1}</legend>
          <p className="text-xs font-medium tabular-nums text-ojol-muted">
            Soal {index + 1} dari {questions.length}
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
                    selected ? "bg-ojol-primary-soft ring-ojol-primary" : "ring-ojol-line hover:bg-ojol-paper",
                  )}
                >
                  <input
                    type="radio"
                    name={`q_${question.id}`}
                    value={key}
                    checked={selected}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: key }))}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase",
                      selected ? "bg-ojol-primary text-white" : "bg-ojol-paper text-ojol-muted ring-1 ring-ojol-line",
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
      <div className="sticky bottom-20 flex items-center justify-between gap-4 rounded-2xl bg-ojol-ink px-5 py-4 text-white lg:bottom-4">
        <p className="text-sm tabular-nums text-white/75">
          {answered}/{questions.length} terjawab
        </p>
        <button
          type="submit"
          disabled={!complete || pending}
          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-ojol-ink transition-colors hover:bg-ojol-paper disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
        >
          {pending ? "Mengirim…" : "Kumpulkan kuis"}
        </button>
      </div>
      <p className="text-center text-xs text-ojol-muted">Kuis hanya bisa dikumpulkan sekali. Periksa kembali jawaban sebelum mengirim.</p>
    </form>
  );
}
