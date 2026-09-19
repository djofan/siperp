import { requireAcademyUser } from "../../api/access";
import { getLearningOverview } from "../../api/courses";
import { PageHeading, LearnerNav } from "../../components/ui";
import { LearningSummary } from "../../components/LearningSummary";

export default async function ProgressPage() {
  const user = await requireAcademyUser();
  const courses = user.academyProfile ? await getLearningOverview(user.academyProfile.id) : [];
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><LearnerNav /><PageHeading title="Progres belajar">Pantau materi yang sudah selesai dan kuis yang sudah lulus.</PageHeading><LearningSummary courses={courses} /></div>;
}
