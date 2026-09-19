import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AdminHeading, SavedNotice, AdminEmpty } from "@/modules/academy/components/admin/AdminUi";
import { ContentForm } from "@/modules/academy/components/admin/ContentForm";
import { DeleteForm } from "@/modules/academy/components/admin/ContentControls";
import { getAdminLesson } from "@/modules/academy/api/admin-curriculum";
import { saveAcademyLesson, saveAcademyAttachment, deleteAcademyContent, deleteAcademyAttachment } from "@/modules/academy/api/actions";
export default async function Page({ params, searchParams }: {
  params: Promise<{ courseId: string; chapterId: string; lessonId: string }>; searchParams: Promise<{ tersimpan?: string }>;
}) {
  await requireAcademyAdmin();
  const { courseId, chapterId, lessonId } = await params;
  const lesson = await getAdminLesson(courseId, chapterId, lessonId);
  if (!lesson) notFound();
  return <><AdminHeading title={lesson.title} description={"Bab: " + lesson.chapter.title} backHref={`/admin/academy/program/${courseId}/bab/${chapterId}`} />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <ContentForm kind="lesson" action={saveAcademyLesson.bind(null, courseId, chapterId, lessonId)} initial={{
      title: lesson.title, slug: lesson.slug, order: lesson.order, isPublished: lesson.isPublished,
      shortDescription: lesson.shortDescription, contentSummary: lesson.contentSummary, thumbnailUrl: lesson.thumbnailUrl,
      videoProvider: lesson.videoProvider, videoUrl: lesson.videoUrl,
    }} />
    <section id="lampiran" className="mt-8 space-y-4"><h2 className="text-xl font-bold text-foreground">Lampiran materi</h2>
      {lesson.attachments.length ? lesson.attachments.map(attachment => <details key={attachment.id} className="rounded-2xl bg-surface p-5">
        <summary className="cursor-pointer font-semibold text-foreground">Edit lampiran: {attachment.title}</summary>
        <div className="mt-4"><ContentForm kind="attachment" action={saveAcademyAttachment.bind(null, courseId, chapterId, lessonId, attachment.id)} initial={{
          title: attachment.title, fileUrl: attachment.fileUrl, fileType: attachment.fileType, fileSize: attachment.fileSize,
        }} /><DeleteForm attachment title={attachment.title} action={deleteAcademyAttachment.bind(null, courseId, chapterId, lessonId, attachment.id)} /></div>
      </details>) : <AdminEmpty>Belum ada lampiran.</AdminEmpty>}
      <details className="rounded-2xl bg-surface p-5"><summary className="cursor-pointer font-semibold text-accent">Tambah lampiran</summary><div className="mt-4"><ContentForm key={lesson.attachments.length} kind="attachment" action={saveAcademyAttachment.bind(null, courseId, chapterId, lessonId, null)} /></div></details>
    </section>
    <DeleteForm title={lesson.title} action={deleteAcademyContent.bind(null, courseId, chapterId, lessonId)} />
  </>;
}

