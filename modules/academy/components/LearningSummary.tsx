import Link from "next/link";
import type { getLearningOverview } from "../api/courses";
import { EmptyState, ProgressBar } from "./ui";

export function LearningSummary({ courses }: { courses: Awaited<ReturnType<typeof getLearningOverview>> }) {
  if (!courses.length) return <EmptyState>Anda belum mengikuti program. <Link href="/academy/program" className="font-semibold underline">Jelajahi program belajar</Link>.</EmptyState>;
  return <div className="grid gap-5 sm:grid-cols-2">{courses.map((course) => <article key={course.id} className="rounded-2xl border border-lazsip-primary-100 bg-white p-6">
    <h2 className="text-xl font-bold">{course.title}</h2><p className="mt-2 text-sm text-lazsip-ink/60">Terdaftar {course.enrolledAt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</p>
    <div className="mt-6"><ProgressBar value={course.percent} /><p className="mt-3 text-sm">{course.completedLessons}/{course.totalLessons} materi selesai · {course.percent}%</p><p className="mt-2 text-sm">{course.passedQuizzes}/{course.totalQuizzes} kuis lulus</p></div>
    <Link href={`/academy/program/${course.slug}`} className="mt-6 inline-block text-sm font-semibold text-lazsip-primary-700">Lanjutkan belajar →</Link>
  </article>)}</div>;
}
