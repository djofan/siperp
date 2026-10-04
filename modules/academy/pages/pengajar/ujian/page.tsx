import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAcademyTeacher } from "../../../api/access";
import { saveTeacherQuiz } from "../../../api/teacher-actions";
import { QuizForm } from "../../../components/admin/QuizForm";
import { PageHeading, inputClass } from "../../../components/ui";
export default async function ExamsPage() {
  await requireAcademyTeacher();
  const chapters = await prisma.zakatAcademyChapter.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true, course: { select: { title: true } }, quizzes: { orderBy: { releaseDay: "asc" }, select: { id: true, title: true, releaseDay: true, isPublished: true, _count: { select: { questions: true } } } } } });
  return <div className="mx-auto max-w-5xl p-4 md:p-6"><PageHeading title="Soal & ujian">Ujian harian 4 kali seminggu pada minggu 1–3, mingguan 3 kali sebulan, dan ujian setiap bab pada akhir bulan.</PageHeading><details className="mb-6 rounded-2xl bg-white p-5"><summary className="cursor-pointer font-semibold text-green-700">Buat ujian</summary><QuizForm creating action={saveTeacherQuiz.bind(null, null)} chapterField={<label className="block text-sm">Bab<select name="chapterId" required className={inputClass}>{chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.course.title} · {chapter.title}</option>)}</select></label>} /></details>
  {chapters.map(chapter => <section key={chapter.id} className="mb-6"><h2 className="mb-3 font-semibold">{chapter.course.title} · {chapter.title}</h2><div className="space-y-3">{chapter.quizzes.map(quiz => <Link key={quiz.id} href={`/academy/pengajar/ujian/${quiz.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4"><span>{quiz.title}<span className="mt-1 block text-xs text-gray-500">Hari {quiz.releaseDay} · {quiz._count.questions} soal · {quiz.isPublished ? "Terpublikasi" : "Draft"}</span></span><span className="text-sm text-green-700">Kelola →</span></Link>)}</div></section>)}</div>;
}
