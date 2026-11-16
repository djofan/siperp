import { academyServerHref } from "@/modules/academy/pwa/server-navigation";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import { notFound, redirect } from "next/navigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage8 } from "@/modules/academy/api/page-contracts";
import { requireAcademyProfile } from "../../../../api/access";
import { getPublicCourse, getEnrollment } from "../../../../api/courses";
import { saveStudyNote } from "../../../../api/actions";
import { lessonReleased, safeResourceUrl } from "../../../../api/policy";
import { AudioPlayer } from "../../../../components/AudioPlayer";
import { VideoPlayer } from "../../../../components/VideoPlayer";
import { ActionForm } from "../../../../components/ActionForm";
import { LearnerNav, inputClass } from "../../../../components/ui";
export default async function LessonPage({ params }: {
    params: Promise<{
        slug: string;
        lessonSlug: string;
    }>;
}) {
    const { profileId } = await requireAcademyProfile();
    const { slug, lessonSlug } = await params;
    const course = await getPublicCourse(slug);
    if (!course)
        notFound();
    if (!await getEnrollment(profileId, course.id))
        redirect(await academyServerHref("/academy/materi"));
    const { lesson, note } = await academyPage<AcademyPage8>(`academy/learning/lessons/${encodeURIComponent(slug)}/${encodeURIComponent(lessonSlug)}`);
    if (!lesson)
        notFound();
    if (!lessonReleased(course.startsAt, lesson.releaseDay))
        return <div className="p-6"><h1 className="text-2xl font-bold">Materi belum dibuka</h1><p className="mt-3 text-gray-500">{course.startsAt ? `Materi tersedia pada hari ke-${lesson.releaseDay} program.` : "Tanggal mulai akan diumumkan setelah persiapan selesai."}</p><Link href="/academy/materi" className="mt-5 inline-block text-green-700">Kembali ke daftar materi</Link></div>;
    const pdfs = lesson.attachments.filter(file => file.fileType === "application/pdf").flatMap(file => {
        const url = safeResourceUrl(file.fileUrl);
        return url ? [{ ...file, url }] : [];
    });
    const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
    const index = lessons.findIndex((item) => item.id === lesson.id);
    return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><LearnerNav /><div className="grid gap-8 lg:grid-cols-[1fr_280px]"><div>
    <Link href="/academy/materi" className="inline-block text-sm text-lazsip-primary-700">← Daftar materi</Link>
    <h1 className="mb-6 mt-3 text-3xl font-bold">{lesson.title}</h1>
    {lesson.videoProvider === "AUDIO" ? lesson.videoUrl && <AudioPlayer key={lesson.videoUrl} url={lesson.videoUrl} title={lesson.title} lessonId={lesson.id} initialPosition={lesson.lessonProgress[0]?.audioSource === lesson.videoUrl ? lesson.lessonProgress[0].audioPosition : 0}/> : <VideoPlayer provider={lesson.videoProvider} url={lesson.videoUrl} title={lesson.title}/>}
    {lesson.contentSummary && <p className="mt-6 whitespace-pre-line leading-8">{lesson.contentSummary}</p>}
    {pdfs.length > 0 && <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5"><h2 className="mb-3 font-semibold">Materi PDF</h2><ul className="space-y-3">{pdfs.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3"><span className="min-w-0 break-words text-sm">{file.title}</span><a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-lazsip-primary-800 px-4 text-sm font-semibold text-white">Buka PDF ↗</a></li>)}</ul></section>}
    <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-5"><h2 className="mb-3 font-semibold">Catatan Belajar</h2><ActionForm action={saveStudyNote.bind(null, lesson.id)} label="Simpan catatan"><label className="sr-only" htmlFor="study-note">Catatan belajar</label><textarea id="study-note" name="content" defaultValue={note?.content ?? ""} maxLength={20000} rows={7} className={inputClass} placeholder="Tulis poin penting dan hal yang ingin ditanyakan…"/></ActionForm></section>
    <nav aria-label="Urutan materi" className="mt-8 flex flex-wrap justify-between gap-4 border-t border-lazsip-primary-100 pt-6 text-sm font-semibold">{index > 0 && <Link href={`/academy/materi/${lessons[index - 1].id}`}>← Materi sebelumnya</Link>}{index < lessons.length - 1 && <Link href={`/academy/materi/${lessons[index + 1].id}`}>Materi selanjutnya →</Link>}</nav>
  </div><aside className="h-fit rounded-2xl border border-lazsip-primary-100 bg-white p-5"><h2 className="mb-4 font-bold">Daftar materi</h2><ol className="space-y-2">{lessons.map((item, position) => <li key={item.id}><Link aria-current={item.id === lesson.id ? "page" : undefined} href={`/academy/materi/${item.id}`} className={`block rounded-xl px-3 py-3 text-sm ${item.id === lesson.id ? "bg-lazsip-primary-800 text-white" : "hover:bg-lazsip-primary-50"}`}>{position + 1}. {item.title}</Link></li>)}</ol></aside></div></div>;
}
