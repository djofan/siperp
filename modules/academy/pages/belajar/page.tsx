import Link from "next/link";
import { requireAcademyParticipant } from "../../api/access";
import { getLearningOverview, listParticipantQuizzes } from "../../api/courses";
import { PageHeading, EmptyState } from "../../components/ui";
import { AcademyIcon } from "../../components/icons";
import { DashboardReminders } from "../../components/DashboardReminders";
export default async function DashboardPage() {
  const user = await requireAcademyParticipant();
  const [courses, quizzes] = user.academyProfile ? await Promise.all([getLearningOverview(user.academyProfile.id), listParticipantQuizzes(user.academyProfile.id)]) : [[], []];
  const links = [
    { href: "program", title: "Baca & dengarkan materi", icon: "BookOpen", detail: "12 materi selama 3 minggu. Minggu ke-4 tanpa materi baru." },
    { href: "kuis", title: "Kerjakan ujian", icon: "Quiz", detail: "Ujian harian, mingguan, dan per bab." },
    { href: "tanya-jawab", title: "Tanya pengajar", icon: "Users", detail: "Ajukan pertanyaan dari materi yang dipelajari." },
  ] as const;
  return <div className="mx-auto max-w-6xl p-4 md:p-8"><PageHeading eyebrow="Ruang peserta" title={`Selamat datang, ${user.name}`}>Belajar, kerjakan ujian, dan tanyakan hal yang belum dipahami.</PageHeading><DashboardReminders profileId={user.academyProfile?.id} /><div className="mb-8 grid gap-4 sm:grid-cols-3">{links.map(link => <Link key={link.href} href={`/academy/${link.href}`} className="rounded-2xl border border-gray-100 bg-white p-5 hover:border-green-300"><AcademyIcon name={link.icon} className="mb-4 h-6 w-6 text-green-600" /><h2 className="font-semibold">{link.title}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{link.detail}</p></Link>)}</div><section className="mb-8 rounded-2xl border border-green-100 bg-green-50 p-5"><h2 className="font-semibold">Jadwal ujian</h2><p className="mt-2 text-sm leading-6 text-gray-600">Harian 4 kali seminggu pada minggu 1–3 · Mingguan 3 kali sebulan · Ujian setiap bab pada akhir bulan.</p><p className="mt-2 text-xs text-gray-500">{quizzes.length} ujian terpublikasi di program Anda. Jadwal lengkap tersedia di menu Ujian Saya.</p></section><h2 className="mb-4 font-semibold">Program saya</h2>{!courses.length ? <EmptyState>Belum mengikuti program. <Link href="/academy/program" className="text-green-700 underline">Lihat materi dan program</Link>.</EmptyState> : <div className="space-y-4">{courses.map(course => <article key={course.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5"><div><h3 className="font-semibold">{course.title}</h3><p className="mt-2 text-sm text-gray-500">Nilai berbobot: {course.grading.score.toFixed(2)} · {course.grading.complete ? "Lengkap" : "Sementara"}</p></div><Link href={`/academy/program/${course.slug}`} className="rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white">Buka materi →</Link></article>)}</div>}</div>;
}
