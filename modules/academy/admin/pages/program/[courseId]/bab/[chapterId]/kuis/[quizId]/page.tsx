import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminQuiz } from "@/modules/academy/api/admin-quizzes";
import { quizDateInput } from "@/modules/academy/api/admin-quiz-validation";
import { saveAcademyQuiz, saveAcademyQuestion, deleteAcademyQuestion, deleteAcademyQuiz } from "@/modules/academy/api/actions";
import { AdminHeading, SavedNotice, AdminEmpty } from "@/modules/academy/components/admin/AdminUi";
import { DeleteForm } from "@/modules/academy/components/admin/ContentControls";
import { QuizForm } from "@/modules/academy/components/admin/QuizForm";
import { QuestionForm } from "@/modules/academy/components/admin/QuestionForm";
export default async function Page({ params, searchParams }: {
  params: Promise<{ courseId: string; chapterId: string; quizId: string }>; searchParams: Promise<{ tersimpan?: string }>;
}) {
  await requireAcademyAdmin();
  const { courseId, chapterId, quizId } = await params;
  const quiz = await getAdminQuiz(courseId, chapterId, quizId);
  if (!quiz) notFound();
  return <><AdminHeading title={quiz.title} description={`Bab: ${quiz.chapter.title} · ${quiz._count.attempts} percobaan peserta`} backHref={`/admin/academy/program/${courseId}/bab/${chapterId}`} />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <QuizForm action={saveAcademyQuiz.bind(null, courseId, chapterId, quizId)} initial={{
      title: quiz.title, description: quiz.description ?? "", passingScore: quiz.passingScore, timeLimitMinutes: quiz.timeLimitMinutes,
      quizDate: quizDateInput(quiz.quizDate), isPublished: quiz.isPublished, isActive: quiz.isActive, allowRetake: quiz.allowRetake,
    }} />
    <section id="pertanyaan" className="mt-8 space-y-4"><h2 className="text-xl font-bold text-foreground">Pertanyaan & opsi</h2>
      <p className="text-sm leading-6 text-foreground/60">Perubahan atau penghapusan pertanyaan tidak mengubah soal dan penilaian percobaan yang sudah dimulai. Pertanyaan terakhir pada kuis terpublikasi tidak dapat dihapus; jadikan draft dahulu.</p>
      {quiz.questions.length ? quiz.questions.map((question, index) => <details key={question.id} className="rounded-2xl bg-surface p-5">
        <summary className="cursor-pointer font-semibold text-foreground">{index + 1}. {question.question.slice(0, 160)}{question.question.length > 160 ? "…" : ""}<span className="ml-3 text-xs font-normal text-foreground/60">Urutan {question.order}</span></summary>
        <div className="mt-5"><QuestionForm action={saveAcademyQuestion.bind(null, courseId, chapterId, quizId, question.id)} initial={question} />
          <DeleteForm title={"pertanyaan " + (index + 1)} description="Pertanyaan beserta opsi dihapus dari kuis. Soal dan jawaban pada percobaan yang sudah dimulai tetap tersimpan." action={deleteAcademyQuestion.bind(null, courseId, chapterId, quizId, question.id)} />
        </div>
      </details>) : <AdminEmpty>Belum ada pertanyaan. Tambahkan sebelum mempublikasikan kuis.</AdminEmpty>}
      <details className="rounded-2xl bg-surface p-5"><summary className="cursor-pointer font-semibold text-accent">Tambah pertanyaan</summary><div className="mt-5"><QuestionForm key={quiz.questions.length} action={saveAcademyQuestion.bind(null, courseId, chapterId, quizId, null)} /></div></details>
    </section>
    <DeleteForm title={quiz.title} description="Kuis beserta pertanyaan dan opsi dihapus permanen. Kuis yang sudah memiliki percobaan peserta tidak dapat dihapus; nonaktifkan publikasinya." action={deleteAcademyQuiz.bind(null, courseId, chapterId, quizId)} />
  </>;
}

