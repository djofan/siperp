import Link from "next/link";
import type { getLearningOverview } from "../api/courses";
import { EmptyState, ProgressBar } from "./ui";

export function LearningSummary({ courses }: { courses: Awaited<ReturnType<typeof getLearningOverview>> }) {
  if (!courses.length) return <EmptyState>Anda belum mengikuti program. <Link href="/academy/program" className="font-semibold underline">Jelajahi program belajar</Link>.</EmptyState>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course) => <article key={course.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
    <h2 className="font-semibold text-gray-900">{course.title}</h2><p className="mt-2 text-xs text-gray-400">Terdaftar {course.enrolledAt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</p>
    <div className="mt-6"><ProgressBar value={course.percent} /><p className="mt-3 text-sm">{course.completedLessons}/{course.totalLessons} materi selesai · {course.percent}%</p><p className="mt-2 text-sm">{course.passedQuizzes}/{course.totalQuizzes} kuis lulus</p></div>
    <div className="mt-4 rounded-xl bg-green-50 p-3"><p className="text-sm font-semibold text-green-800">Nilai berbobot: {course.grading.score.toFixed(2)}</p><p className="mt-1 text-xs text-green-700">Harian {course.grading.means.DAILY.toFixed(1)} · Pekanan {course.grading.means.WEEKLY.toFixed(1)} · Akhir {course.grading.means.FINAL.toFixed(1)}</p>{!course.grading.complete && <p className="mt-1 text-xs text-gray-500">Nilai sementara; evaluasi yang belum dikerjakan dihitung 0.</p>}</div>
    <Link href={`/academy/program/${course.slug}`} className="mt-6 inline-block text-sm font-semibold text-lazsip-primary-700">Lanjutkan belajar →</Link>
  </article>)}</div>;
}
