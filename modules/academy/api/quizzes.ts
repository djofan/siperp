import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { gradeQuiz, quizDeadline, readSnapshot, lessonReleased, type QuizSnapshot } from "./policy";
import { AcademyError } from "./errors";

export function remainingQuizSeconds(startedAt: Date, minutes: number, closesAt?: string | null) {
  return Math.ceil((quizDeadline(startedAt, minutes, closesAt) - Date.now()) / 1000);
}

async function serialized<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (retry >= 2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2034", "P2002"].includes(error.code)) throw error;
    }
  }
}

async function requireQuizAccess(tx: Prisma.TransactionClient, profileId: string, quizId: string) {
  const quiz = await tx.zakatAcademyQuiz.findFirst({
    where: { id: quizId, isPublished: true, chapter: { isPublished: true, course: { isPublished: true, enrollments: { some: { profileId } } } } },
    select: { id: true, isActive: true, quizDate: true, closesAt: true, releaseDay: true, passingScore: true, timeLimitMinutes: true, allowRetake: true, chapter: { select: { course: { select: { startsAt: true } } } },
      questions: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, question: true, explanation: true, type: true, weight: true, options: { orderBy: { id: "asc" }, select: { id: true, label: true, isCorrect: true } } } },
    },
  });
  if (!quiz) throw new AcademyError("Kuis tidak tersedia untuk akun Anda.");
  return quiz;
}

export async function startQuiz(profileId: string, quizId: string) {
  return serialized(async (tx) => {
    const quiz = await requireQuizAccess(tx, profileId, quizId);
    if (!lessonReleased(quiz.chapter.course.startsAt, quiz.releaseDay)) throw new AcademyError("Evaluasi belum dibuka sesuai jadwal program.");
    if (!quiz.isActive || (quiz.quizDate && quiz.quizDate > new Date())) throw new AcademyError("Kuis belum dibuka.");
    if (quiz.closesAt && quiz.closesAt <= new Date()) throw new AcademyError("Waktu evaluasi sudah ditutup.");
    if (!quiz.questions.length || quiz.questions.some((q) => q.type === "MULTIPLE" ? !q.options.some(o => o.isCorrect) : q.options.filter((o) => o.isCorrect).length !== 1)) throw new AcademyError("Soal kuis belum siap.");
    const latest = await tx.zakatAcademyQuizAttempt.findFirst({ where: { profileId, quizId }, orderBy: { attemptNumber: "desc" } });
    if (latest && !latest.isCompleted) {
      const snapshot = readSnapshot(latest.answers);
      if (Date.now() >= quizDeadline(latest.startedAt, snapshot.timeLimitMinutes, snapshot.closesAt)) {
        await tx.zakatAcademyQuizAttempt.update({ where: { id: latest.id }, data: { ...gradeQuiz(snapshot), isCompleted: true, submittedAt: new Date(quizDeadline(latest.startedAt, snapshot.timeLimitMinutes, snapshot.closesAt)) } });
      }
      return latest.id;
    }
    if (latest && !quiz.allowRetake) throw new AcademyError("Kuis ini hanya dapat dikerjakan satu kali.");
    const snapshot: QuizSnapshot = { passingScore: quiz.passingScore, timeLimitMinutes: quiz.timeLimitMinutes, closesAt: quiz.closesAt?.toISOString() ?? null, questions: quiz.questions, responses: {} };
    const attempt = await tx.zakatAcademyQuizAttempt.create({ data: {
      profileId, quizId, attemptNumber: (latest?.attemptNumber ?? 0) + 1, answers: snapshot as unknown as Prisma.InputJsonValue,
    } });
    return attempt.id;
  });
}

// Snapshot menjaga penilaian tetap konsisten walau soal diubah admin kemudian.
// Kunci jawaban tidak pernah diteruskan ke player selama percobaan berlangsung.
export async function updateAttempt(profileId: string, attemptId: string, answer?: { questionId: string; optionId: string | string[] }, submit = false) {
  return serialized(async (tx) => {
    const attempt = await tx.zakatAcademyQuizAttempt.findFirst({ where: { id: attemptId, profileId } });
    if (!attempt) throw new AcademyError("Percobaan tidak ditemukan.");
    const quiz = await requireQuizAccess(tx, profileId, attempt.quizId);
    if (attempt.isCompleted) return { completed: true, quizId: attempt.quizId };
    const snapshot = readSnapshot(attempt.answers);
    const deadline = quizDeadline(attempt.startedAt, snapshot.timeLimitMinutes, snapshot.closesAt);
    const expired = Date.now() >= deadline;
    if (!expired && !quiz.isActive) throw new AcademyError("Kuis sedang dinonaktifkan.");
    if (answer && !expired) {
      const question = snapshot.questions.find((q) => q.id === answer.questionId);
      const selected = Array.isArray(answer.optionId) ? answer.optionId : [answer.optionId];
      if (!question || selected.length > question.options.length || new Set(selected).size !== selected.length || selected.some(id => !question.options.some(option => option.id === id)) || (question.type !== "MULTIPLE" && selected.length !== 1)) throw new AcademyError("Pilihan jawaban tidak valid.");
      snapshot.responses[answer.questionId] = answer.optionId;
    }
    const completed = submit || expired;
    await tx.zakatAcademyQuizAttempt.update({ where: { id: attempt.id }, data: {
      answers: snapshot as unknown as Prisma.InputJsonValue,
      ...(completed ? { ...gradeQuiz(snapshot), isCompleted: true, submittedAt: expired ? new Date(deadline) : new Date() } : {}),
    } });
    return { completed, quizId: attempt.quizId };
  });
}

export async function getOwnAttempt(profileId: string, quizId: string, attemptId: string) {
  return prisma.zakatAcademyQuizAttempt.findFirst({
    where: { id: attemptId, quizId, profileId, quiz: { isPublished: true, chapter: { isPublished: true, course: { isPublished: true, enrollments: { some: { profileId } } } } } },
    include: { quiz: { select: { title: true, closesAt: true } } },
  });
}
