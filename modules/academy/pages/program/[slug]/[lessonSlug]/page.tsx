import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAcademyProfile } from "../../../../api/access";
import { getPublicCourse, getEnrollment } from "../../../../api/courses";
import { markLesson } from "../../../../api/actions";
import { safeResourceUrl } from "../../../../api/policy";
import { VideoPlayer } from "../../../../components/VideoPlayer";
import { ActionForm } from "../../../../components/ActionForm";
import { LearnerNav } from "../../../../components/ui";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonSlug: string }> }) {
  const { profileId } = await requireAcademyProfile();
  const { slug, lessonSlug } = await params;
  const course = await getPublicCourse(slug);
  if (!course) notFound();
  if (!await getEnrollment(profileId, course.id)) redirect(`/academy/program/${slug}`);
  const lesson = await prisma.zakatAcademyLesson.findFirst({
    where: { slug: lessonSlug, isPublished: true, chapter: { courseId: course.id, isPublished: true } },
    select: { id: true, title: true, contentSummary: true, videoProvider: true, videoUrl: true,
      attachments: { select: { id: true, title: true, fileUrl: true } },
      lessonProgress: { where: { profileId }, select: { completed: true } },
    },
  });
  if (!lesson) notFound();
  const completed = lesson.lessonProgress[0]?.completed ?? false;
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><LearnerNav /><div className="grid gap-8 lg:grid-cols-[1fr_280px]"><div>
    <VideoPlayer provider={lesson.videoProvider} url={lesson.videoUrl} title={lesson.title} />
    <Link href={`/academy/program/${slug}`} className="mt-6 inline-block text-sm text-lazsip-primary-700">← {course.title}</Link>
    <h1 className="mt-3 text-3xl font-bold">{lesson.title}</h1>
    <p role="status" className="mt-3 text-sm font-medium text-lazsip-primary-700">{completed ? "Materi sudah diselesaikan" : "Tandai selesai setelah mempelajari materi ini."}</p>
    {lesson.contentSummary && <p className="mt-6 whitespace-pre-line leading-8">{lesson.contentSummary}</p>}
    {lesson.attachments.length > 0 && <section className="mt-8 rounded-2xl bg-white p-6"><h2 className="font-bold">Lampiran materi</h2><ul className="mt-3 space-y-3">{lesson.attachments.map((attachment) => { const url = safeResourceUrl(attachment.fileUrl); return url ? <li key={attachment.id}><a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">{attachment.title} ↗</a></li> : null; })}</ul></section>}
    <ActionForm key={String(completed)} className="mt-8" action={markLesson.bind(null, lesson.id, !completed)} label={completed ? "Tandai belum selesai" : "Tandai selesai"} />
    <nav aria-label="Urutan materi" className="mt-8 flex flex-wrap justify-between gap-4 border-t border-lazsip-primary-100 pt-6 text-sm font-semibold">{index > 0 && <Link href={`/academy/program/${slug}/${lessons[index - 1].slug}`}>← Materi sebelumnya</Link>}{index < lessons.length - 1 && <Link href={`/academy/program/${slug}/${lessons[index + 1].slug}`}>Materi selanjutnya →</Link>}</nav>
  </div><aside className="h-fit rounded-2xl border border-lazsip-primary-100 bg-white p-5"><h2 className="mb-4 font-bold">Daftar materi</h2><ol className="space-y-2">{lessons.map((item, position) => <li key={item.id}><Link aria-current={item.id === lesson.id ? "page" : undefined} href={`/academy/program/${slug}/${item.slug}`} className={`block rounded-xl px-3 py-3 text-sm ${item.id === lesson.id ? "bg-lazsip-primary-800 text-white" : "hover:bg-lazsip-primary-50"}`}>{position + 1}. {item.title}</Link></li>)}</ol></aside></div></div>;
}
