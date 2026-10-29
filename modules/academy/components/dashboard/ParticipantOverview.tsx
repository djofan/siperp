import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, GraduationCap, MessageCircle } from "lucide-react";
import { requireAcademyParticipant } from "../../api/access";
import { getLearningOverview, listParticipantQuizzes } from "../../api/courses";
import { PageHeading, EmptyState, ProgressBar } from "../ui";
import { DashboardReminders } from "../DashboardReminders";
import { MetricCard } from "../DashboardCards";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
export default async function ParticipantOverview() {
  const user = await requireAcademyParticipant();
  const [courses, quizzes] = user.academyProfile ? await Promise.all([getLearningOverview(user.academyProfile.id), listParticipantQuizzes(user.academyProfile.id)]) : [[], []];
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const links = [
    { href: "program", title: "Materi belajar", icon: BookOpen, detail: "Baca materi dan dengarkan audio sesuai jadwal." },
    { href: "kuis", title: "Ujian saya", icon: ClipboardList, detail: "Lihat jadwal dan kerjakan evaluasi belajar." },
    { href: "tanya-jawab", title: "Tanya pengajar", icon: MessageCircle, detail: "Ajukan pertanyaan dan diskusikan materi." },
  ];
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><PageHeading eyebrow="Ruang peserta" title={`Selamat datang, ${user.name}`}>Lanjutkan belajar dan pantau perkembangan Anda di sini.</PageHeading><Button asChild><Link href="/academy/program">Mulai belajar <ArrowRight /></Link></Button></div>
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"><MetricCard label="Program diikuti" value={courses.length} icon={<GraduationCap />} /><MetricCard label="Materi terpublikasi" value={totalLessons} icon={<BookOpen />} tone="blue" /><MetricCard label="Materi selesai" value={completedLessons} icon={<CheckCircle2 />} tone="violet" /><MetricCard label="Ujian terpublikasi" value={quizzes.length} icon={<ClipboardList />} tone="amber" /></div>
    <DashboardReminders profileId={user.academyProfile?.id} />
    <section><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Program saya</h2><Button asChild variant="link" className="h-auto p-0"><Link href="/academy/program">Semua program <ArrowRight /></Link></Button></div>
    {!courses.length ? <EmptyState>Belum mengikuti program. <Link href="/academy/program" className="text-emerald-700 underline">Lihat program belajar</Link>.</EmptyState> : <div className="grid gap-4 xl:grid-cols-2">{courses.map(course => <Card key={course.id} className="border-slate-200 shadow-sm"><CardHeader className="p-5 pb-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{course.title}</h3><Badge variant="secondary">{course.percent}% selesai</Badge></div><p className="text-sm text-slate-500">{course.completedLessons} dari {course.totalLessons} materi diselesaikan</p></CardHeader><CardContent className="space-y-4 px-5 pb-5"><ProgressBar value={course.percent} /><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Nilai {course.grading.score.toFixed(2)} · {course.grading.complete ? "Lengkap" : "Sementara"}</p><Button asChild variant="outline" size="sm"><Link href={`/academy/program/${course.slug}`}>Buka materi <ArrowRight /></Link></Button></div></CardContent></Card>)}</div>}</section>
    <section><h2 className="mb-4 text-base font-semibold text-slate-900">Akses cepat</h2><div className="grid gap-4 md:grid-cols-3">{links.map(link => <Link key={link.href} href={`/academy/${link.href}`} className="group"><Card className="h-full border-slate-200 shadow-sm transition-colors group-hover:border-emerald-300"><CardContent className="p-5"><link.icon className="mb-4 size-5 text-emerald-600" /><h3 className="text-sm font-semibold text-slate-900">{link.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{link.detail}</p></CardContent></Card></Link>)}</div></section>
  </div>;
}
