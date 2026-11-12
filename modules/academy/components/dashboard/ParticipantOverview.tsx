import { TodayLearning } from "../TodayLearning";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList } from "lucide-react";
import { requireAcademyParticipant } from "../../api/access";
import { getLearningOverview, listParticipantQuizzes } from "../../api/courses";
import { PageHeading } from "../ui";
import { MetricCard } from "../DashboardCards";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { InstructorProfile } from "./InstructorProfile";
export default async function ParticipantOverview() {
  const user = await requireAcademyParticipant();
  const [courses, quizzes] = user.academyProfile ? await Promise.all([getLearningOverview(user.academyProfile.id), listParticipantQuizzes(user.academyProfile.id)]) : [[], []];
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const links = [
    { href: "materi", title: "Materi belajar", icon: BookOpen, detail: "Baca materi dan dengarkan audio sesuai jadwal." },
    { href: "kuis", title: "Ujian saya", icon: ClipboardList, detail: "Lihat jadwal dan kerjakan evaluasi belajar." },
  ];
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><PageHeading eyebrow="Ruang peserta" title={`Ahlan wa sahlan, ${user.name}`}>Lanjutkan belajar dan pantau perkembangan Anda di sini.</PageHeading><Button asChild><Link href="/academy/materi">Mulai belajar <ArrowRight /></Link></Button></div>
    <TodayLearning profileId={user.academyProfile?.id}/>
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4"><MetricCard label="Materi terpublikasi" value={totalLessons} icon={<BookOpen />} tone="blue" /><MetricCard label="Materi selesai" value={completedLessons} icon={<CheckCircle2 />} tone="violet" /><MetricCard label="Ujian terpublikasi" value={quizzes.length} icon={<ClipboardList />} tone="amber" /></div>

    <InstructorProfile />
    <section><h2 className="mb-4 text-base font-semibold text-slate-900">Akses cepat</h2><div className="grid gap-4 md:grid-cols-2">{links.map(link => <Link key={link.href} href={`/academy/${link.href}`} className="group"><Card className="h-full border-slate-200 shadow-sm transition-colors group-hover:border-emerald-300"><CardContent className="p-5"><link.icon className="mb-4 size-5 text-emerald-600" /><h3 className="text-sm font-semibold text-slate-900">{link.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{link.detail}</p></CardContent></Card></Link>)}</div></section>
  </div>;
}
