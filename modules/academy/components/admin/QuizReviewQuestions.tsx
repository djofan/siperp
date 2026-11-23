import { formatNumericText } from "@/lib/number-format";
import { QuestionMedia } from "../QuestionMedia";
import type { QuestionValues } from "./QuestionForm";

const types: Record<string, string> = { SINGLE: "Pilihan ganda (satu jawaban)", MULTIPLE: "Pilihan ganda (beberapa jawaban)", TRUE_FALSE: "Benar / Salah" };

export function QuizReviewQuestions({ questions }: { questions: QuestionValues[] }) {
  return <section className="border-t border-gray-200 pt-5" aria-label="Seluruh soal dan kunci jawaban">
    <h3 className="font-semibold">Pertanyaan dan pilihan jawaban ({formatNumericText(questions.length)} soal)</h3>
    <p className="mt-2 text-sm text-gray-600">Periksa teks soal, semua opsi, dan kunci jawaban yang ditandai sebelum mengaktifkan ujian.</p>
    <ol className="mt-4 space-y-4">{questions.map((question, index) => <li key={question.id || index} className="min-w-0 rounded-xl border border-gray-200 p-4 sm:p-5">
      <h4 className="font-semibold">Soal {formatNumericText(index + 1)}</h4>
      <p className="mt-1 text-xs text-gray-600">{types[question.type ?? "SINGLE"] ?? question.type} · Bobot {formatNumericText(question.weight ?? 1)}</p>
      <p className="my-4 whitespace-pre-wrap break-words text-sm leading-7">{question.question}</p>
      {question.id && question.mediaMime && <QuestionMedia question={{ id: question.id, mediaMime: question.mediaMime, mediaName: question.mediaName, mediaAlt: question.mediaAlt }} className="mb-4" />}
      <ol aria-label={`Pilihan jawaban soal ${index + 1}`} className="space-y-2">{question.options.map((option, optionIndex) => <li key={option.id || optionIndex} className={`flex min-w-0 flex-wrap items-start gap-2 rounded-lg border p-3 text-sm ${option.isCorrect ? "border-green-300 bg-green-50 text-green-900" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
        <span className="font-semibold" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}.</span><span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{option.label}</span>
        {option.isCorrect && <span className="font-semibold">✓ Jawaban benar</span>}
      </li>)}</ol>
      {question.explanation && <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm"><h5 className="font-semibold">Pembahasan</h5><p className="mt-1 whitespace-pre-wrap break-words leading-6">{question.explanation}</p></div>}
    </li>)}</ol>
  </section>;
}
