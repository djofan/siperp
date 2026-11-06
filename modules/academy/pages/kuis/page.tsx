import Link from "next/link";
import { requireAcademyParticipant } from "../../api/access";
import { listParticipantQuizzes } from "../../api/courses";
import { lessonReleased } from "../../api/policy";
import { PageHeading, EmptyState } from "../../components/ui";
import { learnerCohorts } from "../../api/learner-cohorts";
export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const user = await requireAcademyParticipant();
  const cohorts = user.academyProfile ? (await learnerCohorts()).filter(item => item.joined) : [];
  const cohort = (await searchParams).cohort ?? cohorts.find(item => item.current)?.id ?? cohorts[0]?.id ?? "";
  const quizzes = user.academyProfile ? await listParticipantQuizzes(user.academyProfile.id, cohort) : [];
  const now = new Date();
  const categories = [{ kind: "DAILY", title: "Ujian harian", detail: "4 kali seminggu pada minggu 1–3" }, { kind: "WEEKLY", title: "Ujian mingguan", detail: "3 kali sebulan" }, { kind: "FINAL", title: "Ujian akhir", detail: "Evaluasi akhir angkatan" }] as const;
  return <div className="mx-auto max-w-5xl p-4 md:p-8"><PageHeading title="Ujian">Kerjakan ujian yang tersedia untuk menguji pemahamanmu.</PageHeading>{cohorts.length > 0 && <form className="mb-6 flex gap-3"><label className="text-sm">Angkatan<select name="cohort" defaultValue={cohort} className="ml-3 rounded-lg border border-gray-200 px-3 py-2">{cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white">Tampilkan</button></form>}{categories.map(category => {
    const items = quizzes.filter(quiz => quiz.kind === category.kind).sort((a, b) => a.releaseDay - b.releaseDay);
    return <section key={category.kind} className="mb-8"><div className="mb-4 flex flex-wrap items-baseline gap-3"><h2 className="font-semibold">{category.title}</h2><p className="text-sm text-gray-500">{category.detail}</p></div>{!items.length ? <EmptyState>Ujian belum dipublikasikan pengajar.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(quiz => {
      const done = quiz.attempts.find(attempt => attempt.isCompleted);
      const available = quiz.isActive && lessonReleased(quiz.chapter.course.startsAt, quiz.releaseDay, now) && (!quiz.quizDate || quiz.quizDate <= now) && (!quiz.closesAt || quiz.closesAt > now);
      return <article key={quiz.id} className={`academy-quiz-card rounded-2xl border bg-white p-5 ${done ? "border-green-100" : "border-gray-100"}`}><p className="text-xs text-gray-500">{quiz.chapter.title} · Hari {quiz.releaseDay}</p><div className="mt-2 flex items-start justify-between gap-3"><h3 className="font-semibold">{quiz.title}</h3>{done && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">✓ Selesai</span>}</div><p className="mt-3 text-sm text-gray-500">{quiz._count.questions} soal · {quiz.timeLimitMinutes} menit · Lulus {quiz.passingScore}</p><p className={`mt-3 text-sm font-medium ${available ? "text-green-700" : "text-gray-500"}`}>{done ? `Hasil terakhir: ${Number(done.score ?? 0).toFixed(2)}` : available ? "Tersedia untuk dikerjakan" : quiz.closesAt && quiz.closesAt <= now ? "Waktu ujian berakhir" : "Belum dibuka"}</p>{quiz.quizDate && <p className="mt-2 text-xs text-gray-500">Buka: {quiz.quizDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>}{quiz.closesAt && <p className="mt-1 text-xs text-gray-500">Tutup: {quiz.closesAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>}<Link href={`/academy/kuis/${quiz.id}`} className="mt-4 block rounded-xl bg-green-50 px-3 py-2.5 text-center text-sm font-medium text-green-700">{done ? "Lihat hasil & ujian" : "Lihat ujian"} →</Link></article>;
    })}</div>}</section>;
  })}</div>;
}
