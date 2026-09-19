import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAcademyUser, requireAcademyAvailable } from "../../../api/access";
import { getPublicCourse, getEnrollment } from "../../../api/courses";
import { enrollInCourse } from "../../../api/actions";
import { safeResourceUrl } from "../../../api/policy";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeading, EmptyState, linkButton } from "../../../components/ui";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAcademyAvailable();
  const { slug } = await params;
  const [course, user] = await Promise.all([getPublicCourse(slug), getAcademyUser()]);
  if (!course) notFound();
  const enrollment = await getEnrollment(user?.academyProfile?.id, course.id);
  const material = enrollment ? await prisma.zakatAcademyCourse.findUnique({ where: { id: course.id }, select: { materialUrl: true } }) : null;
  const materialUrl = safeResourceUrl(material?.materialUrl);
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><Link href="/academy/program" className="mb-6 inline-block text-sm text-lazsip-primary-700">← Semua program</Link>
    <PageHeading eyebrow="Program belajar" title={course.title}>{course.shortDescription}</PageHeading>
    {course.description && <p className="mb-8 whitespace-pre-line leading-8 text-lazsip-ink/80">{course.description}</p>}
    <div className="mb-10 rounded-2xl border border-lazsip-primary-100 bg-white p-6">
      {enrollment ? <div className="flex flex-wrap items-center justify-between gap-4"><p className="font-semibold text-lazsip-primary-700">Anda sudah mengikuti program ini.</p>{materialUrl && <a href={materialUrl} target="_blank" rel="noopener noreferrer" className={linkButton}>Buka bahan belajar</a>}</div> : user ? <ActionForm action={enrollInCourse.bind(null, course.id)} label="Ikuti program" /> : <Link href="/academy/masuk" className={linkButton}>Masuk untuk mengikuti program</Link>}
    </div>
    <h2 className="mb-6 text-2xl font-bold">Kurikulum</h2>
    {!course.chapters.length && <EmptyState>Materi program sedang disiapkan.</EmptyState>}
    <div className="space-y-5">{course.chapters.map((chapter, index) => <section key={chapter.id} className="overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white"><div className="bg-lazsip-primary-50 px-6 py-5"><h3 className="font-bold">{index + 1}. {chapter.title}</h3>{chapter.description && <p className="mt-2 text-sm leading-6">{chapter.description}</p>}</div><ul className="divide-y divide-lazsip-primary-50">{chapter.lessons.map((lesson) => <li key={lesson.id} className="px-6 py-4">{enrollment ? <Link href={`/academy/program/${slug}/${lesson.slug}`} className="flex justify-between gap-4 text-sm font-medium hover:underline"><span>{lesson.title}</span><span aria-hidden="true">→</span></Link> : <span className="text-sm">{lesson.title} <span className="text-lazsip-ink/50">· Video</span></span>}</li>)}{chapter.quizzes.map((quiz) => <li key={quiz.id} className="px-6 py-4 text-sm">{enrollment ? <Link href={`/academy/kuis/${quiz.id}`} className="font-semibold text-lazsip-primary-700">Kuis: {quiz.title} →</Link> : `Kuis: ${quiz.title}`}</li>)}</ul></section>)}</div>
  </div>;
}
