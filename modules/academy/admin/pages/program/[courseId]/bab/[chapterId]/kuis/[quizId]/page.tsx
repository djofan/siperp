import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminQuiz } from "@/modules/academy/api/admin-quizzes";
import { quizDateInput } from "@/modules/academy/api/admin-quiz-validation";
import { deleteAcademyQuiz } from "@/modules/academy/api/actions";
import { saveExam } from "@/modules/academy/api/exam-actions";
import { AdminHeading, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { DeleteForm } from "@/modules/academy/components/admin/ContentControls";
import { QuizForm } from "@/modules/academy/components/admin/QuizForm";
export default async function Page({ params, searchParams }: {
  params: Promise<{ courseId: string; chapterId: string; quizId: string }>; searchParams: Promise<{ tersimpan?: string }>;
}) {
  await requireAcademyAdmin();
  const { courseId, chapterId, quizId } = await params;
  const quiz = await getAdminQuiz(courseId, chapterId, quizId);
  if (!quiz) notFound();
  return <><AdminHeading title={quiz.title} description="Kelola pengaturan dan seluruh pertanyaan ujian." backHref="/admin/academy/kuis" />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <QuizForm key={JSON.stringify(quiz)} withQuestions questions={quiz.questions} action={saveExam.bind(null, quizId)} initial={{
      title: quiz.title, description: quiz.description ?? "", passingScore: quiz.passingScore, timeLimitMinutes: quiz.timeLimitMinutes,
      quizDate: quizDateInput(quiz.quizDate), isPublished: quiz.isPublished, isActive: quiz.isActive, allowRetake: quiz.allowRetake,
      kind: quiz.kind, closesAt: quizDateInput(quiz.closesAt), releaseDay: quiz.releaseDay,
    }} />
    <DeleteForm title={quiz.title} description="Ujian beserta pertanyaan dan opsi dihapus permanen. Ujian yang sudah memiliki percobaan peserta tidak dapat dihapus." action={deleteAcademyQuiz.bind(null, courseId, chapterId, quizId)} />
  </>;
}
