import Link from "next/link";
import { notFound } from "next/navigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage7 } from "@/modules/academy/api/page-contracts";
import { getAcademyUser, requireAcademyAvailable } from "../../../api/access";
import { getPublicCourse, getEnrollment } from "../../../api/courses";
import { enrollInCourse } from "../../../api/actions";
import { safeResourceUrl } from "../../../api/policy";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeading, EmptyState, linkButton } from "../../../components/ui";
export default async function CoursePage({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    await requireAcademyAvailable();
    const { slug } = await params;
    const [course, user] = await Promise.all([getPublicCourse(slug), getAcademyUser()]);
    if (!course)
        notFound();
    const enrollment = await getEnrollment(user?.academyProfile?.id, course.id);
    const material = enrollment ? await academyPage<AcademyPage7["material"]>(`academy/learning/material/${encodeURIComponent(course.id)}`) : null;
    const materialUrl = safeResourceUrl(material?.materialUrl);
    return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><Link href="/academy/program" className="mb-6 inline-block text-sm text-lazsip-primary-700">← Semua program</Link>
    <PageHeading eyebrow="Program belajar" title={course.title}>{course.shortDescription}</PageHeading>
    <div className="mb-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-green-50 px-3 py-2 text-green-700">{course.teacher}</span><span className="rounded-full bg-orange-50 px-3 py-2 text-orange-700">{course.durationDays} hari · Audio harian</span><span className="rounded-full bg-gray-100 px-3 py-2">{course._count.enrollments} peserta</span>{course.isSimulation && <span className="rounded-full bg-amber-100 px-3 py-2">Simulasi</span>}</div>
    <p className="mb-6 text-sm text-gray-500">{course.startsAt ? `Mulai ${course.startsAt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}. Audio dan evaluasi dibuka bertahap.` : "Tanggal mulai diumumkan setelah persiapan materi selesai."}</p>
    {course.description && <p className="mb-8 whitespace-pre-line leading-8 text-lazsip-ink/80">{course.description}</p>}
    <div className="mb-10 rounded-2xl border border-lazsip-primary-100 bg-white p-6">
      {enrollment ? <div className="flex flex-wrap items-center justify-between gap-4"><p className="font-semibold text-lazsip-primary-700">Anda sudah mengikuti program ini.</p>{materialUrl && <a href={materialUrl} target="_blank" rel="noopener noreferrer" className={linkButton}>Buka bahan belajar</a>}</div> : user ? <ActionForm action={enrollInCourse.bind(null, course.id)} label="Ikuti program"/> : <Link href="/academy/masuk" className={linkButton}>Masuk untuk mengikuti program</Link>}
    </div>
    <h2 className="mb-6 text-xl font-bold">Daftar materi</h2>
    {!course.chapters.some(chapter => chapter.lessons.length) && <EmptyState>Materi sedang disiapkan.</EmptyState>}
    <div className="space-y-3">{course.chapters.flatMap(chapter => chapter.lessons).map((lesson, index) => <article key={lesson.id} className="academy-card p-5"><Link href={`/academy/materi/${lesson.id}`} className="flex items-center justify-between gap-4 text-sm font-medium"><span>{index + 1}. {lesson.title}</span><span className="text-green-700">Buka →</span></Link></article>)}</div>
  </div>;
}
