import { requireAcademyParticipant } from "../../api/access";
import { getLearningOverview, listParticipantQuizzes } from "../../api/courses";
import { PageHeading } from "../../components/ui";
import { LearningOverview } from "../../components/LearningOverview";
export default async function ProgressPage() {
  const user = await requireAcademyParticipant();
  const [courses, quizzes] = user.academyProfile ? await Promise.all([getLearningOverview(user.academyProfile.id), listParticipantQuizzes(user.academyProfile.id)]) : [[], []];
  return <div className="academy-page"><PageHeading title="Kemajuan Saya">Pantau progres pembelajaran Anda.</PageHeading><LearningOverview courses={courses} quizzes={quizzes} progress /></div>;
}
