import "server-only";
import { prisma } from "@/lib/prisma";
import { examOpensAt, reminderState } from "./development-policy";
export interface ExamNotification { key: string; quizId: string; title: string; course: string; opensAt: Date; closesAt: Date | null; state: "missed" | "upcoming" | "due" | "open"; read: boolean }
export async function getExamNotifications(profileId: string): Promise<ExamNotification[]> {
  const [quizzes, reads] = await Promise.all([
    prisma.zakatAcademyQuiz.findMany({ where: { isPublished: true, isActive: true, chapter: { isPublished: true, course: { isPublished: true, enrollments: { some: { profileId } } } } }, select: { id: true, title: true, releaseDay: true, quizDate: true, closesAt: true, chapter: { select: { course: { select: { title: true, startsAt: true } } } }, attempts: { where: { profileId, isCompleted: true }, select: { id: true }, take: 1 } } }),
    prisma.academyNotificationRead.findMany({ where: { profileId }, select: { key: true } }),
  ]);
  const readKeys = new Set(reads.map(read => read.key));
  const now = new Date();
  return quizzes.flatMap<ExamNotification>(quiz => {
    const opensAt = examOpensAt(quiz.chapter.course.startsAt, quiz.releaseDay, quiz.quizDate);
    const state = reminderState(opensAt, quiz.closesAt, !!quiz.attempts.length, now);
    if (!state || state === "missed" && quiz.closesAt && now.getTime() - quiz.closesAt.getTime() > 7 * 86400_000) return [];
    const key = `${quiz.id}:${state}:${opensAt?.getTime()}:${quiz.closesAt?.getTime() ?? 0}`;
    return [{ key, quizId: quiz.id, title: quiz.title, course: quiz.chapter.course.title, opensAt: opensAt!, closesAt: quiz.closesAt, state, read: readKeys.has(key) }];
  }).sort((a,b) => Number(a.read) - Number(b.read) || (a.closesAt ?? a.opensAt).getTime() - (b.closesAt ?? b.opensAt).getTime());
}
