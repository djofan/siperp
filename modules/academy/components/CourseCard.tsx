/* eslint-disable @next/next/no-img-element -- Thumbnail berasal dari URL konten admin. */
import Link from "next/link";
import { safeResourceUrl } from "../api/policy";
import { AcademyIcon } from "./icons";

export interface PublicCourseCard {
  id: string; title: string; slug: string; shortDescription: string; thumbnailUrl: string | null;
  chapters: { _count: { lessons: number } }[];
}

export function CourseCard({ course }: { course: PublicCourseCard }) {
  const thumbnail = safeResourceUrl(course.thumbnailUrl);
  return <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
    <div className="flex aspect-video items-center justify-center overflow-hidden bg-linear-to-br from-green-50 to-green-100">
      {thumbnail ? <img src={thumbnail} alt={course.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <AcademyIcon name="BookOpen" className="h-12 w-12 text-green-300" />}
    </div>
    <div className="flex flex-1 flex-col p-5">
      <h3 className="mb-1.5 font-semibold leading-snug text-gray-900 transition-colors group-hover:text-green-700"><Link href={`/academy/program/${course.slug}`}>{course.title}</Link></h3>
      <p className="mb-3 line-clamp-2 text-sm text-gray-500">{course.shortDescription}</p>
      <div className="mb-4 flex items-center gap-3 text-xs text-gray-400"><span className="flex items-center gap-1"><AcademyIcon name="BookOpen" className="h-3.5 w-3.5" />{course.chapters.length} Modul</span><span className="h-1 w-1 rounded-full bg-gray-300" /><span className="flex items-center gap-1"><AcademyIcon name="PlayCircle" className="h-3.5 w-3.5" />{course.chapters.reduce((sum, chapter) => sum + chapter._count.lessons, 0)} Lesson</span></div>
      <Link href={`/academy/program/${course.slug}`} className="mt-auto block w-full rounded-xl border border-gray-200 py-2 text-center text-sm font-medium text-gray-700 transition-all hover:border-green-300 hover:bg-green-50 hover:text-green-700">Pelajari Sekarang</Link>
    </div>
  </article>;
}
