import { requireAcademyParticipant } from "../../api/access";
import { listParticipantQuizzes } from "../../api/courses";
import { PageHeading } from "../../components/ui";
import { LearningOverview } from "../../components/LearningOverview";
export default async function ProgressPage() {
  const user = await requireAcademyParticipant();
  const quizzes = user.academyProfile ? await listParticipantQuizzes(user.academyProfile.id) : [];
  return <div className="academy-page"><PageHeading title="Progres Saya">Pantau hasil dan riwayat ujian Anda.</PageHeading><LearningOverview quizzes={quizzes} /></div>;
}
