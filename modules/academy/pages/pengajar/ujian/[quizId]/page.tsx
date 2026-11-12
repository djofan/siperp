import Link from "next/link";
import { notFound } from "next/navigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage12 } from "@/modules/academy/api/page-contracts";
import { requireAcademyTeacher } from "../../../../api/access";
import { quizDateInput } from "../../../../api/admin-quiz-validation";
import { saveTeacherQuiz, saveTeacherQuestion } from "../../../../api/teacher-actions";
import { QuizForm } from "../../../../components/admin/QuizForm";
import { QuestionForm } from "../../../../components/admin/QuestionForm";
import { TeacherPagination } from "../../../../components/TeacherPagination";
import { PageHeading } from "../../../../components/ui";

type ExamData = AcademyPage12 & {
  cohortTitle: string;
  pagination: { page: number; lastPage: number; total: number; perPage: number };
};
const types = { SINGLE: "Pilihan ganda", MULTIPLE: "Beberapa jawaban", TRUE_FALSE: "Benar / Salah" };

export default async function ExamPage({ params, searchParams }: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAcademyTeacher();
  const { quizId } = await params;
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const { scope, quiz, pagination, cohortTitle } = await academyPage<ExamData>(
    `academy/teacher/quizzes/${encodeURIComponent(quizId)}?view=table&page=${page}`,
  );
  if (!scope || !quiz) notFound();
  const base = `/academy/pengajar/ujian/${quiz.id}`;
  const selected = quiz.questions.find(question => question.id === query.edit);
  const editingQuiz = query.edit === "ujian";
  return <div className="mx-auto max-w-7xl p-4 md:p-6">
    <Link href="/academy/pengajar/ujian" className="mb-5 inline-block text-sm text-green-700">Kembali ke daftar ujian</Link>
    <PageHeading title={quiz.title}>{cohortTitle} · {quiz.kind === "DAILY" ? quiz.chapter.title : "Semua bab"}. Kelola soal dan kunci jawaban ujian.</PageHeading>
    <details id="edit-ujian" open={editingQuiz} className="mb-6 scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-green-700">Pengaturan ujian</summary>
      <div className="mt-4"><QuizForm questionCount={pagination.total} scopeLabel={`${cohortTitle} - ${quiz.chapter.title}`} action={saveTeacherQuiz.bind(null, quiz.id)}
        chapterField={<input type="hidden" name="chapterId" value={scope.chapterId}/>}
        initial={{ ...quiz, description: quiz.description ?? "", quizDate: quizDateInput(quiz.quizDate), closesAt: quizDateInput(quiz.closesAt) }}/></div>
    </details>
    <details id="tambah-soal" open={pagination.total === 0} className="mb-6 rounded-2xl border border-green-100 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-green-700">Tambah soal</summary>
      <div className="mt-5"><QuestionForm action={saveTeacherQuestion.bind(null, quiz.id, null)}/></div>
    </details>
    <section id="daftar-soal" className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-label="Daftar soal">
      <div className="border-b border-gray-100 p-5"><h2 className="font-semibold">Daftar soal</h2><p className="mt-1 text-sm text-gray-500">{pagination.total} soal · {cohortTitle} · {quiz.kind === "DAILY" ? quiz.chapter.title : "Semua bab"}</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-600"><tr>{["No.", "Pertanyaan", "Media", "Jenis", "Opsi", "Kunci jawaban", "Bobot", "Aksi"].map(label => <th scope="col" key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{quiz.questions.map((question, index) => <tr key={question.id} className={selected?.id === question.id ? "bg-green-50" : "hover:bg-gray-50"}>
          <td className="px-5 py-4 text-gray-500">{(pagination.page - 1) * 10 + index + 1}</td>
          <td className="max-w-md px-5 py-4"><p className="line-clamp-3 break-words">{question.question}</p></td>
          <td className="px-5 py-4">{question.mediaMime?.startsWith("image/") ? "Gambar" : question.mediaMime?.startsWith("audio/") ? "Audio" : "—"}</td>
          <td className="px-5 py-4">{types[question.type]}</td><td className="px-5 py-4">{question.options.length}</td>
          <td className="max-w-xs px-5 py-4"><p className="line-clamp-3 break-words">{question.options.filter(option => option.isCorrect).map(option => option.label).join("; ") || "Belum diatur"}</p></td>
          <td className="px-5 py-4">{question.weight}</td>
          <td className="px-5 py-4"><Link href={`${base}?page=${pagination.page}&edit=${encodeURIComponent(question.id)}#edit-soal`} className="inline-flex rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800" aria-label={`Edit soal ${(pagination.page - 1) * 10 + index + 1}`}>Edit soal</Link></td>
        </tr>)}{!quiz.questions.length && <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-500">Belum ada soal. <a href="#tambah-soal" className="text-green-700 underline">Buka Tambah soal</a>, isi pertanyaan dan pilih jawaban benar sebelum mengaktifkan ujian.</td></tr>}</tbody>
      </table></div>
      <TeacherPagination {...pagination} base={base}/>
    </section>
    {selected && <section id="edit-soal" key={selected.id} className="mt-6 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-5 flex justify-between gap-3"><h2 className="font-semibold">Edit soal</h2><Link href={`${base}?page=${pagination.page}`} className="text-sm text-gray-600 underline">Tutup</Link></div>
      <QuestionForm action={saveTeacherQuestion.bind(null, quiz.id, selected.id)} initial={selected}/>
    </section>}
  </div>;
}
