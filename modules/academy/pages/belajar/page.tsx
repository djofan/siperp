import { requireAcademyUser } from "../../api/access";
import { getLearningOverview } from "../../api/courses";
import { PageHeading, LearnerNav } from "../../components/ui";
import { LearningSummary } from "../../components/LearningSummary";

export default async function DashboardPage() {
  const user = await requireAcademyUser();
  const courses = user.academyProfile ? await getLearningOverview(user.academyProfile.id) : [];
  const total = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const completed = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><LearnerNav /><PageHeading eyebrow="Belajar saya" title={`Assalamu’alaikum, ${user.name}.`}>Lanjutkan perjalanan belajar Anda, satu materi setiap langkah.</PageHeading>
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">{[["Program diikuti", courses.length], ["Total materi", total], ["Materi selesai", completed], ["Progres", `${total ? Math.round(completed / total * 100) : 0}%`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-lazsip-primary-100 bg-white p-5"><p className="text-3xl font-bold text-lazsip-primary-800">{value}</p><p className="mt-2 text-sm text-lazsip-ink/70">{label}</p></div>)}</div>
    <LearningSummary courses={courses} />
  </div>;
}
