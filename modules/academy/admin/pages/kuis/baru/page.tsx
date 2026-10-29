import { requireAcademyAdmin } from "../../../../api/admin-access";
import { saveExam } from "../../../../api/exam-actions";
import { QuizForm } from "../../../../components/admin/QuizForm";
import { AdminHeading } from "../../../../components/admin/AdminUi";
import { academyPage } from "../../../../api/page-data";
import type { AcademyCohort } from "../../../../api/page-contracts";
import { CohortField } from "../../../../components/admin/CohortField";
export default async function NewQuizPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  await requireAcademyAdmin();
  const cohorts = await academyPage<AcademyCohort[]>("academy/admin/cohorts");
  const { cohort = "" } = await searchParams;
  return <><AdminHeading title="Tambah ujian" backHref="/admin/academy/kuis" description="Simpan pengaturan, pertanyaan, opsi, dan kunci jawaban sekaligus." /><QuizForm creating withQuestions chapterField={<CohortField cohorts={cohorts} value={cohort} id="quiz-cohort" />} action={saveExam.bind(null, null)} /></>;
}
