import Link from "next/link";
import { requireAcademyUser } from "../../api/access";
import { listParticipantQuizzes } from "../../api/courses";
import { PageHeading, LearnerNav, EmptyState } from "../../components/ui";

export default async function QuizzesPage() {
  const user = await requireAcademyUser();
  const quizzes = user.academyProfile ? await listParticipantQuizzes(user.academyProfile.id) : [];
  return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><LearnerNav /><PageHeading title="Uji pemahamanmu">Kuis dari program yang Anda ikuti.</PageHeading>
    {!quizzes.length ? <EmptyState>Belum ada kuis. Ikuti program belajar untuk melihat kuis yang tersedia.</EmptyState> : <div className="space-y-4">{quizzes.map((quiz) => <article key={quiz.id} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6"><p className="text-xs text-lazsip-primary-600">{quiz.chapter.title}</p><h2 className="mt-2 text-xl font-bold"><Link href={`/academy/kuis/${quiz.id}`}>{quiz.title}</Link></h2><p className="mt-3 text-sm text-lazsip-ink/70">{quiz._count.questions} soal · {quiz.timeLimitMinutes} menit · Nilai lulus {quiz.passingScore}</p><p className="mt-3 text-sm">{!quiz.isActive ? "Belum aktif" : quiz.quizDate && quiz.quizDate > new Date() ? `Dibuka ${quiz.quizDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB` : "Tersedia"}</p><Link href={`/academy/kuis/${quiz.id}`} className="mt-4 inline-block text-sm font-semibold text-lazsip-primary-700">Lihat kuis dan hasil →</Link></article>)}</div>}
  </div>;
}
