"use client";
import { useUnsavedWork } from "./useUnsavedWork";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishQuiz } from "../api/actions";
import { linkButton } from "./ui";
import { selectedOptions } from "../api/policy";
import { QuestionMedia } from "./QuestionMedia";

export function QuizPlayer({ attemptId, remainingSeconds, questions, responses }: {
  attemptId: string; remainingSeconds: number;
  questions: { id: string; question: string; type?: string; weight?: number; mediaMime?: string | null; mediaName?: string | null; mediaAlt?: string | null; options: { id: string; label: string }[] }[];
  responses: Record<string, string | string[]>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(responses);
  const [seconds, setSeconds] = useState(remainingSeconds);
  const [submitting, setSubmitting] = useState(false);
  const work = useUnsavedWork(submitting);
  const { markSaved } = work;
  const [error, setError] = useState("");
  const [incomplete, setIncomplete] = useState<number[]>([]);
  const deadline = useRef<number | null>(null);
  const answersRef = useRef(answers);
  const submitStarted = useRef(false);
  const autoSubmitted = useRef(false);

  const finish = useCallback(async (force = false) => {
    if (submitStarted.current) return;
    const missing = questions.flatMap((question, index) => selectedOptions(answersRef.current[question.id]).length ? [] : [index + 1]);
    if (!force && missing.length) { setIncomplete(missing); return; }
    submitStarted.current = true; setSubmitting(true); setError("");
    try {
      const result = await finishQuiz(attemptId, answersRef.current);
      if (result.error) throw new Error(result.error);
      markSaved(); router.replace(result.href); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal mengumpulkan jawaban. Coba lagi.");
      submitStarted.current = false; setSubmitting(false);
    }
  }, [attemptId, questions, router, markSaved]);

  useEffect(() => {
    deadline.current ??= Date.now() + remainingSeconds * 1000;
    const timer = setInterval(() => {
      const value = Math.max(0, Math.ceil((deadline.current! - Date.now()) / 1000));
      setSeconds(value);
      if (value <= 1 && !autoSubmitted.current) { autoSubmitted.current = true; void finish(true); }
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds, finish]);

  function selectAnswer(questionId: string, optionId: string | string[]) {
    if (submitting || seconds <= 0) return;
    work.markChanged(); setError(""); setIncomplete([]);
    setAnswers((previous) => {
      const next = { ...previous };
      if (selectedOptions(optionId).length) next[questionId] = optionId;
      else delete next[questionId];
      answersRef.current = next;
      return next;
    });
  }

  return <div>
    {work.offline && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm">Anda sedang offline. Jawaban masih di halaman ini dan belum terkirim. Waktu ujian tetap berjalan; sambungkan internet sebelum mengumpulkan. Jangan tutup atau muat ulang halaman.</p>}
    <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lazsip-primary-200 bg-lazsip-cream p-4"><p className="text-sm">{Object.values(answers).filter(value => selectedOptions(value).length).length}/{questions.length} terjawab</p><p role="timer" className="font-mono text-lg font-bold">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p><p role="status" className="text-xs">Jawaban disimpan saat dikumpulkan</p></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <div className="space-y-6">{questions.map((question, index) => <fieldset key={question.id} disabled={submitting || seconds <= 0} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6 disabled:opacity-70"><legend className="max-w-full px-2 font-semibold">{index + 1}. {question.question}</legend><p className="mt-2 text-xs text-gray-500">Bobot {question.weight ?? 1} · {question.type === "MULTIPLE" ? "Pilih semua jawaban yang benar" : "Pilih satu jawaban"}</p><QuestionMedia question={question} className="mt-4"/><div className="mt-3 space-y-3">{question.options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-lazsip-primary-100 p-4 text-sm leading-6 hover:bg-lazsip-primary-50"><input className="mt-1 accent-lazsip-primary-700" type={question.type === "MULTIPLE" ? "checkbox" : "radio"} name={question.id} value={option.id} checked={selectedOptions(answers[question.id]).includes(option.id)} onChange={() => { const selected = selectedOptions(answers[question.id]); selectAnswer(question.id, question.type === "MULTIPLE" ? selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id] : option.id); }} />{option.label}</label>)}</div></fieldset>)}</div>
    {incomplete.length > 0 && <div role="alert" className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Masih ada {incomplete.length} soal yang belum dijawab.</strong><p className="mt-1">Periksa kembali soal nomor {incomplete.join(", ")}. Jika tetap dikumpulkan, jawaban kosong dihitung salah.</p></div>}
    <button disabled={submitting || seconds <= 0} onClick={() => void finish(incomplete.length > 0)} className={`${linkButton} mt-8 disabled:opacity-50`}>{submitting ? "Menyimpan dan mengumpulkan…" : incomplete.length ? "Tetap kumpulkan jawaban" : "Simpan dan kumpulkan jawaban"}</button>
    <p className="mt-3 text-sm text-lazsip-ink/70">Jawaban baru dikirim setelah tombol di atas ditekan. Ujian dikumpulkan otomatis saat waktu habis.</p>
  </div>;
}
