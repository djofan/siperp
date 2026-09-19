import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AdminHeading } from "@/modules/academy/components/admin/AdminUi";
import { ContentForm } from "@/modules/academy/components/admin/ContentForm";
import { getAdminChapter } from "@/modules/academy/api/admin-curriculum";
import { saveAcademyLesson } from "@/modules/academy/api/actions";
export default async function Page({ params }: { params: Promise<{ courseId: string; chapterId: string }> }) {
  await requireAcademyAdmin();
  const { courseId, chapterId } = await params;
  const chapter = await getAdminChapter(courseId, chapterId);
  if (!chapter) notFound();
  return <><AdminHeading title="Tambah materi" description={chapter.title} backHref={`/admin/academy/program/${courseId}/bab/${chapterId}`} />
    <ContentForm kind="lesson" action={saveAcademyLesson.bind(null, courseId, chapterId, null)} /></>;
}

