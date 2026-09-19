import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AcademyError } from "./errors";
import { questionInput, quizInput } from "./admin-quiz-validation";

// Internal service: all page/action callers must first requireAcademyAdmin().
// Never reads or writes QuizAttempt.answers. Only aggregate counts reach admin pages.
async function serialized<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let retry = 0; ; retry++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (retry < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
      throw error;
    }
  }
}

const questionSelect = {
  id: true, question: true, order: true,
  options: { orderBy: { id: "asc" }, select: { id: true, label: true, isCorrect: true } },
} satisfies Prisma.ZakatAcademyQuizQuestionSelect;

export async function listAdminQuizzes(search: string, requestedPage: number) {
  const where: Prisma.ZakatAcademyQuizWhereInput = search ? { title: { contains: search.slice(0, 100) } } : {};
  const total = await prisma.zakatAcademyQuiz.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const items = await prisma.zakatAcademyQuiz.findMany({
    where, take: 20, skip: (page - 1) * 20, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { id: true, title: true, isPublished: true, isActive: true,
      chapter: { select: { id: true, title: true, courseId: true, course: { select: { title: true } } } },
      _count: { select: { questions: true, attempts: true } },
    },
  });
  return { items, page, pages, total };
}

export async function getAdminQuiz(courseId: string, chapterId: string, quizId: string) {
  return prisma.zakatAcademyQuiz.findFirst({
    where: { id: quizId, chapterId, chapter: { courseId } },
    select: {
      id: true, title: true, description: true, passingScore: true, timeLimitMinutes: true,
      isPublished: true, isActive: true, allowRetake: true, quizDate: true,
      chapter: { select: { title: true } }, _count: { select: { attempts: true } },
      questions: { orderBy: [{ order: "asc" }, { id: "asc" }], select: questionSelect },
    },
  });
}

async function scopedQuiz(tx: Prisma.TransactionClient, courseId: string, chapterId: string, id: string) {
  const quiz = await tx.zakatAcademyQuiz.findFirst({
    where: { id, chapterId, chapter: { courseId } }, select: { id: true, isPublished: true },
  });
  if (!quiz) throw new AcademyError("Kuis tidak ditemukan pada bab ini.");
  return quiz;
}

async function requireReady(tx: Prisma.TransactionClient, quizId: string) {
  const questions = await tx.zakatAcademyQuizQuestion.findMany({ where: { quizId }, select: {
    options: { select: { isCorrect: true } },
  } });
  if (!questions.length || questions.some(question => question.options.length < 2 || question.options.length > 10
    || question.options.filter(option => option.isCorrect).length !== 1)) {
    throw new AcademyError("Kuis perlu minimal satu pertanyaan dengan 2–10 opsi dan tepat satu jawaban benar sebelum dipublikasikan.");
  }
}

export async function saveAdminQuiz(courseId: string, chapterId: string, id: string | null, form: FormData) {
  const data = quizInput(form);
  return serialized(async tx => {
    if (!await tx.zakatAcademyChapter.findFirst({ where: { id: chapterId, courseId }, select: { id: true } })) throw new AcademyError("Bab tidak ditemukan pada program ini.");
    if (id) {
      await scopedQuiz(tx, courseId, chapterId, id);
      if (data.isPublished) await requireReady(tx, id);
      return tx.zakatAcademyQuiz.update({ where: { id }, data, select: { id: true } });
    }
    if (data.isPublished) throw new AcademyError("Simpan sebagai draft dan tambahkan pertanyaan sebelum publikasi.");
    return tx.zakatAcademyQuiz.create({ data: { ...data, chapterId }, select: { id: true } });
  });
}

export async function saveAdminQuestion(courseId: string, chapterId: string, quizId: string, id: string | null, form: FormData) {
  const { options, ...data } = questionInput(form);
  return serialized(async tx => {
    await scopedQuiz(tx, courseId, chapterId, quizId);
    // Lock the quiz for concurrent edits/startQuiz; all option edits commit atomically.
    await tx.zakatAcademyQuiz.update({ where: { id: quizId }, data: { updatedAt: new Date() } });
    const existing = id ? await tx.zakatAcademyQuizQuestion.findFirst({
      where: { id, quizId }, select: { id: true, options: { select: { id: true } } },
    }) : null;
    if (id && !existing) throw new AcademyError("Pertanyaan tidak ditemukan pada kuis ini.");
    const owned = new Set(existing?.options.map(option => option.id) ?? []);
    if (options.some(option => option.id && !owned.has(option.id))) throw new AcademyError("Opsi bukan milik pertanyaan ini.");
    const saved = id
      ? await tx.zakatAcademyQuizQuestion.update({ where: { id }, data, select: { id: true } })
      : await tx.zakatAcademyQuizQuestion.create({ data: { ...data, quizId }, select: { id: true } });
    const retained = options.filter(option => option.id).map(option => option.id);
    await tx.zakatAcademyQuizOption.deleteMany({ where: { questionId: saved.id, id: { notIn: retained } } });
    for (const option of options) {
      const value = { label: option.label, isCorrect: option.isCorrect };
      if (option.id) await tx.zakatAcademyQuizOption.update({ where: { id: option.id }, data: value });
      else await tx.zakatAcademyQuizOption.create({ data: { ...value, questionId: saved.id } });
    }
    return saved;
  });
}

export async function deleteAdminQuestion(courseId: string, chapterId: string, quizId: string, id: string) {
  await serialized(async tx => {
    const quiz = await scopedQuiz(tx, courseId, chapterId, quizId);
    await tx.zakatAcademyQuiz.update({ where: { id: quizId }, data: { updatedAt: new Date() } });
    const deleted = await tx.zakatAcademyQuizQuestion.deleteMany({ where: { id, quizId } });
    if (!deleted.count) throw new AcademyError("Pertanyaan tidak ditemukan pada kuis ini.");
    if (quiz.isPublished) await requireReady(tx, quizId);
  });
}

export async function deleteAdminQuiz(courseId: string, chapterId: string, quizId: string) {
  await serialized(async tx => {
    await scopedQuiz(tx, courseId, chapterId, quizId);
    if (await tx.zakatAcademyQuizAttempt.findFirst({ where: { quizId }, select: { id: true } })) {
      throw new AcademyError("Kuis sudah memiliki percobaan. Nonaktifkan publikasi untuk menjaga riwayat peserta.");
    }
    await tx.zakatAcademyQuiz.delete({ where: { id: quizId } });
  });
}
