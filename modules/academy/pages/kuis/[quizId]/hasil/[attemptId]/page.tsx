import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAcademyProfile } from "../../../../../api/access";
import { getOwnAttempt } from "../../../../../api/quizzes";
import { readSnapshot } from "../../../../../api/policy";
import { PageHeading, LearnerNav } from "../../../../../components/ui";

export default async function ResultPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { profileId } = await requireAcademyProfile();
  const { quizId, attemptId } = await params;
  const attempt = await getOwnAttempt(profileId, quizId, attemptId);
  if (!attempt) notFound();
  if (!attempt.isCompleted) redirect(`/academy/kuis/${quizId}/percobaan/${attemptId}`);
  const snapshot = readSnapshot(attempt.answers);
  return <div className="mx-auto max-w-3xl px-4 py-10"><LearnerNav /><PageHeading eyebrow={`Hasil percobaan ${attempt.attemptNumber}`} title={attempt.quiz.title} />
    <div className="mb-8 rounded-2xl bg-lazsip-primary-800 p-8 text-center text-white"><p className="text-sm">Nilai Anda</p><p className="mt-3 text-6xl font-bold">{Number(attempt.score ?? 0)}</p><p className="mt-4 font-semibold">{attempt.passed ? "Lulus" : "Belum lulus"} · Nilai minimum {snapshot.passingScore}</p></div>
    <h2 className="mb-5 text-xl font-bold">Tinjau jawaban</h2><div className="space-y-5">{snapshot.questions.map((question, index) => <section key={question.id} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6"><h3 className="font-semibold">{index + 1}. {question.question}</h3><ul className="mt-4 space-y-3">{question.options.map((option) => <li key={option.id} className={`rounded-xl p-3 text-sm ${option.isCorrect ? "bg-lazsip-primary-100 text-lazsip-primary-900" : "bg-lazsip-cream"}`}>{option.label}{snapshot.responses[question.id] === option.id && <strong> · Jawaban Anda</strong>}{option.isCorrect && <strong> · Jawaban benar</strong>}</li>)}</ul>{!snapshot.responses[question.id] && <p className="mt-3 text-sm text-red-700">Tidak dijawab.</p>}</section>)}</div>
    <Link href={`/academy/kuis/${quizId}`} className="mt-8 inline-block font-semibold text-lazsip-primary-700">← Kembali ke kuis</Link>
  </div>;
}
