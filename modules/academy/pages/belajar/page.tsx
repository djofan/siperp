import { requireAcademyParticipant } from "../../api/access";
import { getLearningOverview, listParticipantQuizzes } from "../../api/courses";
import { PageHeading } from "../../components/ui";
import { LearningOverview } from "../../components/LearningOverview";
export default async function DashboardPage() {
  const user = await requireAcademyParticipant();
  const [courses, quizzes] = user.academyProfile ? await Promise.all([getLearningOverview(user.academyProfile.id), listParticipantQuizzes(user.academyProfile.id)]) : [[], []];
  return <div className="academy-page"><PageHeading title={`Selamat Datang, ${user.name}! 👋`}>Lanjutkan perjalanan belajar Anda.</PageHeading><LearningOverview courses={courses} quizzes={quizzes} /></div>;
}
