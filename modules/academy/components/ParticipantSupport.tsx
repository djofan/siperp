import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAcademyTeacher } from "../api/access";
import { examOpensAt } from "../api/development-policy";
export async function ParticipantSupport({ compact = false }: { compact?: boolean }) {
  await requireAcademyTeacher();
  const [enrollments, quizzes, attempts] = await Promise.all([
    prisma.zakatAcademyEnrollment.findMany({ where: { profile: { user: { isActive: true } }, course: { isPublished: true } }, select: { id: true, courseId: true, profileId: true, course: { select: { title: true, startsAt: true } }, profile: { select: { user: { select: { name: true } } } } } }),
    prisma.zakatAcademyQuiz.findMany({ where: { isPublished: true, isActive: true, chapter: { isPublished: true, course: { isPublished: true } } }, select: { id: true, releaseDay: true, quizDate: true, closesAt: true, passingScore: true, chapter: { select: { courseId: true } } } }),
    prisma.zakatAcademyQuizAttempt.findMany({ where: { isCompleted: true }, select: { profileId: true, quizId: true, score: true } }),
  ]);
  const best = new Map<string, number>();
  for (const attempt of attempts) { const key = `${attempt.profileId}:${attempt.quizId}`; best.set(key, Math.max(best.get(key) ?? 0, Number(attempt.score ?? 0))); }
  const now = new Date();
  const people = enrollments.flatMap(person => {
    let pending = 0, missed = 0, low = 0;
    for (const quiz of quizzes.filter(quiz => quiz.chapter.courseId === person.courseId)) {
      const opensAt = examOpensAt(person.course.startsAt, quiz.releaseDay, quiz.quizDate);
      if (!opensAt || opensAt > now) continue;
      const score = best.get(`${person.profileId}:${quiz.id}`);
      if (score === undefined) { if (quiz.closesAt && quiz.closesAt <= now) missed++; else pending++; }
      else if (score < quiz.passingScore) low++;
    }
    return pending || missed || low ? [{ ...person, pending, missed, low }] : [];
  }).sort((a,b) => b.missed - a.missed || b.low - a.low || b.pending - a.pending);
  return <section className="mb-8 rounded-2xl border border-amber-100 bg-amber-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Peserta yang perlu dibantu ({people.length})</h2>{compact && <Link href="/academy/pengajar/nilai" className="text-sm text-green-700">Lihat seluruh nilai →</Link>}</div><p className="mt-2 text-xs text-gray-600">Prioritas: batas ujian terlewat, nilai di bawah batas lulus, lalu ujian tersedia yang belum dikerjakan.</p>{!people.length ? <p className="mt-4 text-sm">Belum ada peserta yang memerlukan tindak lanjut berdasarkan ujian yang sudah dibuka.</p> : <ul className="mt-4 divide-y divide-amber-100">{(compact ? people.slice(0,5) : people).map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{person.profile.user.name}</p><p className="text-xs text-gray-500">{person.course.title}</p></div><p>{person.missed > 0 && `${person.missed} terlewat · `}{person.low > 0 && `${person.low} belum lulus · `}{person.pending > 0 && `${person.pending} belum dikerjakan`}</p></li>)}</ul>}</section>;
}
