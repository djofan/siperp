import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AdminHeading } from "@/modules/academy/components/admin/AdminUi";
import { ContentForm } from "@/modules/academy/components/admin/ContentForm";
import { getAdminCourse } from "@/modules/academy/api/admin-curriculum";
import { saveAcademyChapter } from "@/modules/academy/api/actions";
export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  await requireAcademyAdmin();
  const { courseId } = await params;
  const course = await getAdminCourse(courseId);
  if (!course) notFound();
  return <><AdminHeading title="Tambah bab" description={course.title} backHref={`/admin/academy/program/${courseId}`} />
    <ContentForm kind="chapter" action={saveAcademyChapter.bind(null, courseId, null)} /></>;
}

