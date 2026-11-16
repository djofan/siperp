import { academyServerHref } from "@/modules/academy/pwa/server-navigation";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import { notFound, redirect } from "next/navigation";
import { requireAcademyProfile } from "../../../../../api/access";
import { getOwnAttempt } from "../../../../../api/quizzes";
import { readSnapshot } from "../../../../../api/policy";
import { QuizReview } from "../../../../../components/QuizReview";
import { PageHeading, LearnerNav } from "../../../../../components/ui";

export default async function ResultPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { profileId } = await requireAcademyProfile();
  const { quizId, attemptId } = await params;
  const attempt = await getOwnAttempt(profileId, quizId, attemptId);
  if (!attempt) notFound();
  if (!attempt.isCompleted) redirect(await academyServerHref(`/academy/kuis/${quizId}/percobaan/${attemptId}`));
  const snapshot = readSnapshot(attempt.answers);
  return <div className="mx-auto max-w-3xl px-4 py-10"><LearnerNav /><Link href={`/academy/kuis/${quizId}`} className="mb-5 inline-flex items-center text-sm font-medium text-green-700 hover:underline">← Kembali ke detail ujian</Link><PageHeading eyebrow="Hasil ujian" title={attempt.quiz.title} />
    <p role="status" className="rounded-2xl border border-green-300 bg-green-50 p-5 font-semibold text-green-800">✓ Ujian sudah selesai</p>
    <QuizReview snapshot={snapshot} />
    <Link href="/academy/kuis" className="mt-8 inline-block font-semibold text-lazsip-primary-700">← Kembali ke daftar ujian</Link>
  </div>;
}
