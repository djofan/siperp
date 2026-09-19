import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AdminHeading, AddLink, AdminEmpty, PublishBadge, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { ContentForm } from "@/modules/academy/components/admin/ContentForm";
import { OrderForm, DeleteForm } from "@/modules/academy/components/admin/ContentControls";
import { getAdminCourse } from "@/modules/academy/api/admin-curriculum";
import { saveAcademyCourse, reorderAcademyContent, deleteAcademyContent } from "@/modules/academy/api/actions";
export default async function Page({ params, searchParams }: {
  params: Promise<{ courseId: string }>; searchParams: Promise<{ tersimpan?: string }>;
}) {
  await requireAcademyAdmin();
  const { courseId } = await params;
  const course = await getAdminCourse(courseId);
  if (!course) notFound();
  const base = `/admin/academy/program/${courseId}`;
  return <><AdminHeading title={course.title} description="Pengaturan program dan susunan bab." backHref="/admin/academy/program" />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <ContentForm kind="course" action={saveAcademyCourse.bind(null, courseId)} initial={{
      title: course.title, slug: course.slug, order: course.order, isPublished: course.isPublished,
      shortDescription: course.shortDescription, description: course.description, thumbnailUrl: course.thumbnailUrl, materialUrl: course.materialUrl,
    }} />
    <section className="mt-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-foreground">Bab</h2><AddLink href={base + "/bab/baru"}>Tambah bab</AddLink></div>
      {course.chapters.length ? <div className="space-y-3">{course.chapters.map(chapter => <div key={chapter.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5">
        <div><Link href={base + "/bab/" + chapter.id} className="font-bold text-accent hover:underline">{chapter.title}</Link><p className="my-2 text-sm text-foreground/60">{chapter._count.lessons} materi · {chapter._count.quizzes} kuis</p><PublishBadge published={chapter.isPublished} /></div>
        <OrderForm action={reorderAcademyContent.bind(null, courseId, chapter.id, null)} order={chapter.order} title={chapter.title} />
      </div>)}</div> : <AdminEmpty>Tambahkan bab pertama untuk mulai menyusun materi.</AdminEmpty>}
    </section>
    <DeleteForm title={course.title} action={deleteAcademyContent.bind(null, courseId, null, null)} />
  </>;
}

