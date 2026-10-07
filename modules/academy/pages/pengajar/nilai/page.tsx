import { prisma } from "@/lib/prisma";
import { requireAcademyTeacher } from "../../../api/access";
import { getLearningSettings } from "../../../api/learning";
import { weightedGrade } from "../../../api/policy";
import { PageHeading, EmptyState } from "../../../components/ui";
import { ParticipantSupport } from "../../../components/ParticipantSupport";
export default async function GradesPage() {
  await requireAcademyTeacher();
  const [{ weights }, courses, enrollments, attempts] = await Promise.all([
    getLearningSettings(),
    prisma.zakatAcademyCourse.findMany({ select: { id: true, title: true, chapters: { select: { quizzes: { where: { isPublished: true }, select: { id: true, kind: true, title: true } } } } } }),
    prisma.zakatAcademyEnrollment.findMany({ orderBy: { createdAt: "asc" }, select: { courseId: true, profileId: true, profile: { select: { nis: true, user: { select: { name: true } } } } } }),
    prisma.zakatAcademyQuizAttempt.findMany({ where: { isCompleted: true }, select: { profileId: true, quizId: true, score: true } }),
  ]);
  const byProfile = new Map<string, { quizId: string; score: number }[]>();
  for (const attempt of attempts) { const values = byProfile.get(attempt.profileId) ?? []; values.push({ quizId: attempt.quizId, score: Number(attempt.score ?? 0) }); byProfile.set(attempt.profileId, values); }
  return <div className="mx-auto max-w-6xl p-4 md:p-6"><PageHeading title="Nilai semua peserta">Nilai terbaik per ujian. Ujian yang belum dikerjakan dihitung nol pada nilai sementara.</PageHeading><ParticipantSupport />{courses.map(course => {
    const people = enrollments.filter(item => item.courseId === course.id);
    const quizzes = course.chapters.flatMap(chapter => chapter.quizzes);
    return <section key={course.id} className="mb-8"><h2 className="mb-3 font-semibold">{course.title}</h2>{!people.length ? <EmptyState>Belum ada peserta.</EmptyState> : <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Nilai peserta {course.title}</caption><thead className="bg-gray-50"><tr>{["Peserta", "Harian", "Mingguan", "Per bab", "Nilai berbobot", "Status"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{people.map(person => {
      const values = byProfile.get(person.profileId) ?? [];
      const grade = weightedGrade(quizzes, values, weights);
      const best = new Map<string, number>(); for (const value of values) best.set(value.quizId, Math.max(best.get(value.quizId) ?? 0, value.score));
      return <tr key={person.profileId}><th className="px-4 py-4 font-medium">{person.profile.user.name}<span className="block text-xs font-normal text-gray-500">{person.profile.nis}</span><details className="mt-2 font-normal"><summary className="cursor-pointer text-xs text-green-700">Rincian ujian</summary><ul className="mt-2 space-y-1">{quizzes.map(quiz => <li key={quiz.id} className="text-xs">{quiz.title}: {best.has(quiz.id) ? best.get(quiz.id)?.toFixed(2) : "Belum dikerjakan"}</li>)}</ul></details></th>{(["DAILY", "WEEKLY", "FINAL"] as const).map(kind => <td key={kind} className="px-4 py-4">{grade.means[kind].toFixed(2)}</td>)}<td className="px-4 py-4 font-semibold">{grade.score.toFixed(2)}</td><td className="px-4 py-4">{grade.complete ? "Lengkap" : "Sementara"}</td></tr>;
    })}</tbody></table></div>}</section>;
  })}</div>;
}
