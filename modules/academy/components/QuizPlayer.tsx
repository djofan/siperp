"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishQuiz, saveQuizAnswer } from "../api/actions";
import { linkButton } from "./ui";

export function QuizPlayer({ attemptId, quizId, remainingSeconds, questions, responses }: {
  attemptId: string; quizId: string; remainingSeconds: number;
  questions: { id: string; question: string; options: { id: string; label: string }[] }[];
  responses: Record<string, string>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(responses);
  const [seconds, setSeconds] = useState(remainingSeconds);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const deadline = useRef<number | null>(null);
  const saveTask = useRef<Promise<void>>(Promise.resolve());
  const submitStarted = useRef(false);
  const autoSubmitted = useRef(false);

  const finish = useCallback(async () => {
    if (submitStarted.current) return;
    submitStarted.current = true; setSubmitting(true); setError("");
    try {
      await saveTask.current;
      const result = await finishQuiz(attemptId);
      if (result.error) throw new Error(result.error);
      router.replace(result.href); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal mengumpulkan jawaban. Coba lagi.");
      submitStarted.current = false; setSubmitting(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    deadline.current ??= Date.now() + remainingSeconds * 1000;
    const timer = setInterval(() => {
      const value = Math.max(0, Math.ceil((deadline.current! - Date.now()) / 1000));
      setSeconds(value);
      if (value === 0 && !autoSubmitted.current) { autoSubmitted.current = true; void finish(); }
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds, finish]);

  function selectAnswer(questionId: string, optionId: string) {
    if (saving || submitting || seconds <= 0) return;
    setSaving(true); setError("");
    saveTask.current = (async () => {
      try {
        const result = await saveQuizAnswer(attemptId, questionId, optionId);
        if (result.error) throw new Error(result.error);
        if (result.completed) { router.replace(`/academy/kuis/${quizId}/hasil/${attemptId}`); return; }
        setAnswers((previous) => ({ ...previous, [questionId]: optionId }));
      } catch (error) { setError(error instanceof Error ? error.message : "Jawaban belum tersimpan. Pilih kembali jawabannya."); }
      finally { setSaving(false); }
    })();
  }

  return <div>
    <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lazsip-primary-200 bg-lazsip-cream p-4"><p className="text-sm">{Object.keys(answers).length}/{questions.length} terjawab</p><p role="timer" className="font-mono text-lg font-bold">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p><p role="status" className="text-xs">{saving ? "Menyimpan jawaban…" : "Jawaban tersimpan"}</p></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <div className="space-y-6">{questions.map((question, index) => <fieldset key={question.id} disabled={saving || submitting || seconds <= 0} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6 disabled:opacity-70"><legend className="max-w-full px-2 font-semibold">{index + 1}. {question.question}</legend><div className="mt-3 space-y-3">{question.options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-lazsip-primary-100 p-4 text-sm leading-6 hover:bg-lazsip-primary-50"><input className="mt-1 accent-lazsip-primary-700" type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => selectAnswer(question.id, option.id)} />{option.label}</label>)}</div></fieldset>)}</div>
    <button disabled={saving || submitting} onClick={() => void finish()} className={`${linkButton} mt-8 disabled:opacity-50`}>{submitting ? "Mengumpulkan…" : "Kumpulkan jawaban"}</button>
    <p className="mt-3 text-sm text-lazsip-ink/70">Jawaban yang belum diisi dihitung salah. Kuis dikumpulkan otomatis saat waktu habis.</p>
  </div>;
}
