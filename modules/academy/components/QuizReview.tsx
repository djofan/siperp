import { selectedOptions, type QuizSnapshot } from "../api/policy";
import { QuestionMedia } from "./QuestionMedia";

export function QuizReview({ snapshot }: { snapshot: QuizSnapshot }) {
  return <section className="mt-8" aria-labelledby="quiz-review-heading">
    <h2 id="quiz-review-heading" className="mb-5 text-xl font-bold">Hasil pengerjaan ujian</h2>
    <div className="space-y-5">{snapshot.questions.map((question, index) => {
      const selected = selectedOptions(snapshot.responses[question.id]);
      const correct = question.options.filter(option => option.isCorrect).map(option => option.id);
      const answeredCorrectly = correct.length > 0 && selected.length === correct.length && new Set(selected).size === selected.length && selected.every(id => correct.includes(id));
      const status = !selected.length ? "Tidak dijawab" : answeredCorrectly ? "Benar" : "Salah";
      return <article key={question.id} className="rounded-2xl border border-lazsip-primary-100 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 flex-1 whitespace-pre-wrap break-words font-semibold">{index + 1}. {question.question}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${answeredCorrectly ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{status}</span></div>
        <QuestionMedia question={question} className="mt-4" />
        <ul className="mt-4 space-y-3">{question.options.map(option => {
          const chosen = selected.includes(option.id);
          return <li key={option.id} className={`break-words rounded-xl p-3 text-sm ${option.isCorrect ? "bg-green-50 text-green-800" : chosen ? "bg-red-50 text-red-800" : "bg-gray-50"}`}>
            {option.label}{chosen && <strong> · Jawaban Anda</strong>}{option.isCorrect && <strong> · Jawaban benar</strong>}
          </li>;
        })}</ul>
        {question.explanation && <div className="mt-4 border-t border-gray-100 pt-4"><h4 className="text-sm font-semibold">Pembahasan</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{question.explanation}</p></div>}
      </article>;
    })}</div>
  </section>;
}
