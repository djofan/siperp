import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminChapter } from "@/modules/academy/api/admin-curriculum";
import { saveAcademyQuiz } from "@/modules/academy/api/actions";
import { AdminHeading } from "@/modules/academy/components/admin/AdminUi";
import { QuizForm } from "@/modules/academy/components/admin/QuizForm";
export default async function Page({ params }: { params: Promise<{ courseId: string; chapterId: string }> }) {
  await requireAcademyAdmin();
  const { courseId, chapterId } = await params;
  const chapter = await getAdminChapter(courseId, chapterId);
  if (!chapter) notFound();
  return <><AdminHeading title="Tambah kuis" description={"Bab: " + chapter.title} backHref={`/admin/academy/program/${courseId}/bab/${chapterId}`} />
    <QuizForm creating action={saveAcademyQuiz.bind(null, courseId, chapterId, null)} /></>;
}

