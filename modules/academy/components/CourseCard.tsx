/* eslint-disable @next/next/no-img-element -- Thumbnail berasal dari URL konten admin. */
import Link from "next/link";
import { safeResourceUrl } from "../api/policy";

export interface PublicCourseCard {
  id: string; title: string; slug: string; shortDescription: string; thumbnailUrl: string | null;
  chapters: { _count: { lessons: number } }[];
}

export function CourseCard({ course }: { course: PublicCourseCard }) {
  const thumbnail = safeResourceUrl(course.thumbnailUrl);
  return <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white shadow-sm">
    <div className="flex aspect-video items-center justify-center overflow-hidden bg-lazsip-primary-100">
      {thumbnail ? <img src={thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="text-sm font-semibold tracking-[0.15em] text-lazsip-primary-700">ZAKAT ACADEMY</span>}
    </div>
    <div className="flex flex-1 flex-col p-6">
      <p className="text-xs font-medium text-lazsip-primary-600">{course.chapters.length} bab · {course.chapters.reduce((sum, chapter) => sum + chapter._count.lessons, 0)} materi</p>
      <h3 className="mt-3 text-xl font-bold text-lazsip-primary-900"><Link href={`/academy/program/${course.slug}`} className="hover:underline">{course.title}</Link></h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-lazsip-ink/70">{course.shortDescription}</p>
      <Link href={`/academy/program/${course.slug}`} className="mt-auto pt-6 text-sm font-semibold text-lazsip-primary-700">Lihat program <span aria-hidden="true">→</span></Link>
    </div>
  </article>;
}
