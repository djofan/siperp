import Link from "next/link";
import { notFound } from "next/navigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage12 } from "@/modules/academy/api/page-contracts";
import { requireAcademyTeacher } from "../../../../api/access";
import { quizDateInput } from "../../../../api/admin-quiz-validation";
import { saveTeacherQuiz, saveTeacherQuestion } from "../../../../api/teacher-actions";
import { QuizForm } from "../../../../components/admin/QuizForm";
import { QuestionForm } from "../../../../components/admin/QuestionForm";
import { PageHeading } from "../../../../components/ui";
export default async function ExamPage({ params }: {
    params: Promise<{
        quizId: string;
    }>;
}) {
    await requireAcademyTeacher();
    const { quizId } = await params;
    const { scope, quiz } = await academyPage<AcademyPage12>(`academy/teacher/quizzes/${encodeURIComponent(quizId)}`);
    if (!scope)
        notFound();
    if (!quiz)
        notFound();
    return <div className="mx-auto max-w-3xl p-4 md:p-6"><Link href="/academy/pengajar/ujian" className="mb-5 inline-block text-sm text-green-700">← Daftar ujian</Link><PageHeading title={quiz.title}>Atur jadwal dan kunci jawaban. Simpan soal sebelum mempublikasikan ujian.</PageHeading><QuizForm action={saveTeacherQuiz.bind(null, quiz.id)} chapterField={<input type="hidden" name="chapterId" value={scope.chapterId}/>} initial={{ ...quiz, description: quiz.description ?? "", quizDate: quizDateInput(quiz.quizDate), closesAt: quizDateInput(quiz.closesAt) }}/>
  <section className="mt-8 space-y-4"><h2 className="font-semibold">Soal ({quiz.questions.length})</h2>{quiz.questions.map((question, index) => <details key={question.id} className="rounded-2xl border border-gray-100 bg-white p-5"><summary className="cursor-pointer font-medium">{index + 1}. {question.question}</summary><div className="mt-5"><QuestionForm action={saveTeacherQuestion.bind(null, quiz.id, question.id)} initial={question}/></div></details>)}<details className="rounded-2xl border border-green-100 bg-white p-5"><summary className="cursor-pointer font-semibold text-green-700">Tambah soal</summary><div className="mt-5"><QuestionForm action={saveTeacherQuestion.bind(null, quiz.id, null)}/></div></details></section></div>;
}
