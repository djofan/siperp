import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AdminHeading, AddLink, AdminEmpty, PublishBadge, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { ContentForm } from "@/modules/academy/components/admin/ContentForm";
import { OrderForm, DeleteForm } from "@/modules/academy/components/admin/ContentControls";
import { getAdminChapter } from "@/modules/academy/api/admin-curriculum";
import { saveAcademyChapter, reorderAcademyContent, deleteAcademyContent } from "@/modules/academy/api/actions";
export default async function Page({ params, searchParams }: {
  params: Promise<{ courseId: string; chapterId: string }>; searchParams: Promise<{ tersimpan?: string }>;
}) {
  await requireAcademyAdmin();
  const { courseId, chapterId } = await params;
  const chapter = await getAdminChapter(courseId, chapterId);
  if (!chapter) notFound();
  const base = `/admin/academy/program/${courseId}/bab/${chapterId}`;
  return <><AdminHeading title={chapter.title} description={"Program: " + chapter.course.title} backHref={`/admin/academy/program/${courseId}`} />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <ContentForm kind="chapter" action={saveAcademyChapter.bind(null, courseId, chapterId)} initial={{
      title: chapter.title, slug: chapter.slug, order: chapter.order, isPublished: chapter.isPublished, description: chapter.description,
    }} />
    <section className="mt-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-foreground">Materi</h2><AddLink href={base + "/materi/baru"}>Tambah materi</AddLink></div>
      {chapter.lessons.length ? <div className="space-y-3">{chapter.lessons.map(lesson => <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5">
        <div><Link href={base + "/materi/" + lesson.id} className="font-bold text-accent hover:underline">{lesson.title}</Link><p className="my-2 text-sm text-foreground/60">{lesson.videoProvider} · {lesson._count.attachments} lampiran</p><PublishBadge published={lesson.isPublished} /></div>
        <OrderForm action={reorderAcademyContent.bind(null, courseId, chapterId, lesson.id)} order={lesson.order} title={lesson.title} />
      </div>)}</div> : <AdminEmpty>Belum ada materi pada bab ini.</AdminEmpty>}
    </section>
    <section className="mt-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-foreground">Kuis</h2><AddLink href={base + "/kuis/baru"}>Tambah kuis</AddLink></div>
      {chapter.quizzes.length ? <div className="space-y-3">{chapter.quizzes.map(quiz => <div key={quiz.id} className="rounded-2xl bg-surface p-5">
        <Link className="font-bold text-accent hover:underline" href={base + "/kuis/" + quiz.id}>{quiz.title}</Link>
        <p className="my-2 text-sm text-foreground/60">{quiz._count.questions} pertanyaan · {quiz.isActive ? "Pengerjaan aktif" : "Pengerjaan nonaktif"}</p><PublishBadge published={quiz.isPublished} />
      </div>)}</div> : <AdminEmpty>Belum ada kuis pada bab ini.</AdminEmpty>}
    </section>
    <DeleteForm title={chapter.title} action={deleteAcademyContent.bind(null, courseId, chapterId, null)} />
  </>;
}
