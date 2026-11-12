import { requireAcademyParticipant } from "../../api/access";
import { getOwnRankings, listParticipantQuizzes } from "../../api/courses";
import { PageHeading } from "../../components/ui";
import { LearningOverview } from "../../components/LearningOverview";
export default async function ProgressPage() {
  const user = await requireAcademyParticipant();
  const [quizzes, rankings] = user.academyProfile ? await Promise.all([listParticipantQuizzes(user.academyProfile.id), getOwnRankings(user.academyProfile.id)]) : [[], []];
  return <div className="academy-page"><PageHeading title="Progres Saya">Pantau hasil dan riwayat ujian Anda.</PageHeading><LearningOverview quizzes={quizzes} rankings={rankings} /></div>;
}
