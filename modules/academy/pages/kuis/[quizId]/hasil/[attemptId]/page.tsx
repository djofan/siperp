import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAcademyProfile } from "../../../../../api/access";
import { getOwnAttempt } from "../../../../../api/quizzes";
import { readSnapshot, selectedOptions } from "../../../../../api/policy";
import { reviewAvailable } from "../../../../../api/development-policy";
import { PageHeading, LearnerNav } from "../../../../../components/ui";

export default async function ResultPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { profileId } = await requireAcademyProfile();
  const { quizId, attemptId } = await params;
  const attempt = await getOwnAttempt(profileId, quizId, attemptId);
  if (!attempt) notFound();
  if (!attempt.isCompleted) redirect(`/academy/kuis/${quizId}/percobaan/${attemptId}`);
  const snapshot = readSnapshot(attempt.answers);
  const mayReview = reviewAvailable(attempt.quiz.closesAt, snapshot.closesAt);
  return <div className="mx-auto max-w-3xl px-4 py-10"><LearnerNav /><PageHeading eyebrow={`Hasil percobaan ${attempt.attemptNumber}`} title={attempt.quiz.title} />
    <div className="mb-8 rounded-2xl bg-lazsip-primary-800 p-8 text-center text-white"><p className="text-sm">Nilai Anda</p><p className="mt-3 text-6xl font-bold">{Number(attempt.score ?? 0)}</p><p className="mt-4 font-semibold">{attempt.passed ? "Lulus" : "Belum lulus"} · Nilai minimum {snapshot.passingScore}</p></div>
    {mayReview ? <><h2 className="mb-5 text-xl font-bold">Pembahasan ujian</h2><div className="space-y-5">{snapshot.questions.map((question, index) => <section key={question.id} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6"><h3 className="font-semibold">{index + 1}. {question.question}</h3><ul className="mt-4 space-y-3">{question.options.map((option) => <li key={option.id} className={`rounded-xl p-3 text-sm ${option.isCorrect ? "bg-green-50 text-green-800" : "bg-gray-50"}`}>{option.label}{selectedOptions(snapshot.responses[question.id]).includes(option.id) && <strong> · Jawaban Anda</strong>}{option.isCorrect && <strong> · Jawaban benar</strong>}</li>)}</ul>{!selectedOptions(snapshot.responses[question.id]).length && <p className="mt-3 text-sm text-red-700">Tidak dijawab.</p>}<p className="mt-4 whitespace-pre-wrap text-sm leading-7">{question.explanation || "Pengajar belum mengisi penjelasan untuk soal ini."}</p></section>)}</div></> : <p className="rounded-2xl bg-white p-6 text-sm text-gray-600">Pembahasan dan kunci jawaban dibuka setelah batas ujian berakhir. {attempt.quiz.closesAt ? `Jadwal tutup: ${attempt.quiz.closesAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB.` : "Pengajar belum menetapkan batas tutup."}</p>}
    <Link href={`/academy/kuis/${quizId}`} className="mt-8 inline-block font-semibold text-lazsip-primary-700">← Kembali ke kuis</Link>
  </div>;
}
