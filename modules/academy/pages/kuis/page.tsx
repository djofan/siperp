import Link from "next/link";
import { requireAcademyParticipant } from "../../api/access";
import { listParticipantQuizzes } from "../../api/courses";
import { lessonReleased } from "../../api/policy";
import { PageHeading, EmptyState } from "../../components/ui";
export default async function ExamsPage() {
  const user = await requireAcademyParticipant();
  const quizzes = user.academyProfile ? await listParticipantQuizzes(user.academyProfile.id) : [];
  const now = new Date();
  const categories = [{ kind: "DAILY", title: "Ujian harian", detail: "4 kali seminggu pada minggu 1–3" }, { kind: "WEEKLY", title: "Ujian mingguan", detail: "3 kali sebulan" }, { kind: "FINAL", title: "Ujian per bab", detail: "Setiap bab pada akhir bulan" }] as const;
  return <div className="mx-auto max-w-5xl p-4 md:p-8"><PageHeading title="Ujian saya">Periksa jadwal dan kerjakan ujian dari program Anda.</PageHeading>{categories.map(category => {
    const items = quizzes.filter(quiz => quiz.kind === category.kind).sort((a, b) => a.releaseDay - b.releaseDay);
    return <section key={category.kind} className="mb-8"><div className="mb-4 flex flex-wrap items-baseline gap-3"><h2 className="font-semibold">{category.title}</h2><p className="text-sm text-gray-500">{category.detail}</p></div>{!items.length ? <EmptyState>Ujian belum dipublikasikan pengajar.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2">{items.map(quiz => {
      const done = quiz.attempts.find(attempt => attempt.isCompleted);
      const available = quiz.isActive && lessonReleased(quiz.chapter.course.startsAt, quiz.releaseDay, now) && (!quiz.quizDate || quiz.quizDate <= now) && (!quiz.closesAt || quiz.closesAt > now);
      return <article key={quiz.id} className="rounded-2xl border border-gray-100 bg-white p-5"><p className="text-xs text-gray-500">{quiz.chapter.title} · Hari {quiz.releaseDay}</p><h3 className="mt-2 font-semibold">{quiz.title}</h3><p className="mt-3 text-sm text-gray-500">{quiz._count.questions} soal · {quiz.timeLimitMinutes} menit · Lulus {quiz.passingScore}</p><p className={`mt-3 text-sm font-medium ${available ? "text-green-700" : "text-gray-500"}`}>{done ? `Hasil terakhir: ${Number(done.score ?? 0).toFixed(2)}` : available ? "Tersedia untuk dikerjakan" : quiz.closesAt && quiz.closesAt <= now ? "Waktu ujian berakhir" : "Belum dibuka"}</p>{quiz.quizDate && <p className="mt-2 text-xs text-gray-500">Buka: {quiz.quizDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>}{quiz.closesAt && <p className="mt-1 text-xs text-gray-500">Tutup: {quiz.closesAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>}<Link href={`/academy/kuis/${quiz.id}`} className="mt-4 inline-block text-sm font-semibold text-green-700">{done ? "Lihat hasil & ujian" : "Lihat ujian"} →</Link></article>;
    })}</div>}</section>;
  })}</div>;
}
