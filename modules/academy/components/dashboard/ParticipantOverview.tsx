import { TodayLearning } from "../TodayLearning";
import Link from "next/link";
import { BookOpen, ChartNoAxesCombined, ClipboardList, Trophy } from "lucide-react";
import { requireAcademyParticipant } from "../../api/access";
import { getOwnRankings, listParticipantQuizzes } from "../../api/courses";
import { learnerCohorts } from "../../api/learner-cohorts";
import { listMaterials } from "../../api/materials";
import { PageHeading } from "../ui";
import { MetricCard } from "../DashboardCards";
import { Card, CardContent } from "../ui/card";
import { InstructorProfile } from "./InstructorProfile";
export default async function ParticipantOverview() {
  const user = await requireAcademyParticipant();
  const cohorts = user.academyProfile ? (await learnerCohorts()).filter(item => item.joined) : [];
  const cohort = cohorts.find(item => item.current)?.id ?? cohorts[0]?.id ?? "";
  const [materials, quizzes, rankings] = user.academyProfile ? await Promise.all([
    listMaterials("", 1, false, "", cohort),
    listParticipantQuizzes(user.academyProfile.id, cohort),
    getOwnRankings(user.academyProfile.id),
  ]) : [null, [], []];
  const ranking = cohort ? rankings.find(item => item.cohortId === cohort) : rankings[0];
  const links = [
    { href: "materi", title: "Materi belajar", icon: BookOpen, detail: "Baca materi dan dengarkan audio sesuai jadwal." },
    { href: "kuis", title: "Ujian saya", icon: ClipboardList, detail: "Lihat jadwal dan kerjakan evaluasi belajar." },
  ];
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><PageHeading eyebrow="Ruang peserta" title={`Ahlan wa sahlan, ${user.name}`}>Lanjutkan belajar dan pantau perkembangan Anda di sini.</PageHeading></div>
    <TodayLearning profileId={user.academyProfile?.id}/>
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <MetricCard label="Materi" value={materials?.total ?? 0} icon={<BookOpen />} tone="blue" />
      <MetricCard label="Ujian" value={quizzes.length} icon={<ClipboardList />} tone="amber" />
      <MetricCard label={ranking?.finalCompleted ? "Hasil akhir" : "Nilai total sementara"} value={ranking ? ranking.score.toFixed(2) : "—"} detail={ranking?.title} icon={<ChartNoAxesCombined />} tone="violet" />
      <MetricCard label="Peringkat" value={ranking?.rank ?? "—"} detail={ranking ? `${ranking.title} · dari ${ranking.total} peserta` : "Belum tersedia"} icon={<Trophy />} />
    </div>

    <InstructorProfile />
    <section><h2 className="mb-4 text-base font-semibold text-slate-900">Akses cepat</h2><div className="grid gap-4 md:grid-cols-2">{links.map(link => <Link key={link.href} href={`/academy/${link.href}`} className="group"><Card className="h-full border-slate-200 shadow-sm transition-colors group-hover:border-emerald-300"><CardContent className="p-5"><link.icon className="mb-4 size-5 text-emerald-600" /><h3 className="text-sm font-semibold text-slate-900">{link.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{link.detail}</p></CardContent></Card></Link>)}</div></section>
  </div>;
}
