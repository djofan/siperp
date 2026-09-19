import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AcademyError } from "./errors";
import { isCourseComplete } from "./policy";
import { adminPage, certificateInput } from "./admin-participant-validation";

// Internal services: pages and Server Actions must call requireAcademyAdmin first.
// No QuizAttempt.answers or question/option data is read by these queries.
const personSelect = { id: true, nis: true, user: { select: { name: true, email: true, isActive: true } } } satisfies Prisma.ZakatAcademyProfileSelect;
const courseSelect = { id: true, title: true, isPublished: true } satisfies Prisma.ZakatAcademyCourseSelect;
const enrollmentSelect = {
  id: true, profileId: true, courseId: true, createdAt: true,
  profile: { select: personSelect }, course: { select: courseSelect },
} satisfies Prisma.ZakatAcademyEnrollmentSelect;
type Enrollment = Prisma.ZakatAcademyEnrollmentGetPayload<{ select: typeof enrollmentSelect }>;
type LessonStats = { id: string; total: bigint; completed: bigint; finishedAt: Date | null };
type QuizStats = { id: string; total: bigint; passed: bigint; finishedAt: Date | null };

// Two aggregate queries per page, restricted to the requested enrollment IDs.
// The unique (profile_id, lesson_id) constraint prevents inflated lesson counts.
// Quiz attempts are reduced to the FIRST successful completion per profile/quiz.
async function progressFor(enrollments: Enrollment[], db: Prisma.TransactionClient = prisma) {
  if (!enrollments.length) return [];
  const ids = enrollments.map(item => item.id);
  const profileIds = [...new Set(enrollments.map(item => item.profileId))];
  const courseIds = [...new Set(enrollments.map(item => item.courseId))];
  const [lessons, quizzes] = await Promise.all([
    db.$queryRaw<LessonStats[]>(Prisma.sql`
      SELECT e.id, COUNT(l.id) AS total,
        COUNT(CASE WHEN p.completed = TRUE THEN 1 END) AS completed,
        MAX(CASE WHEN p.completed = TRUE THEN p.completed_at END) AS finishedAt
      FROM zakat_academy_enrollments e
      JOIN zakat_academy_chapters c ON c.course_id = e.course_id AND c.is_published = TRUE
      JOIN zakat_academy_lessons l ON l.chapter_id = c.id AND l.is_published = TRUE
      LEFT JOIN zakat_academy_lesson_progress p ON p.lesson_id = l.id AND p.profile_id = e.profile_id
      WHERE e.id IN (${Prisma.join(ids)})
      GROUP BY e.id
    `),
    db.$queryRaw<QuizStats[]>(Prisma.sql`
      SELECT e.id, COUNT(q.id) AS total, COUNT(a.quiz_id) AS passed, MAX(a.firstPass) AS finishedAt
      FROM zakat_academy_enrollments e
      JOIN zakat_academy_chapters c ON c.course_id = e.course_id AND c.is_published = TRUE
      JOIN zakat_academy_quizzes q ON q.chapter_id = c.id AND q.is_published = TRUE
      LEFT JOIN (
        SELECT attempt.profile_id, attempt.quiz_id, MIN(attempt.submitted_at) AS firstPass
        FROM zakat_academy_quiz_attempts attempt
        JOIN zakat_academy_quizzes source ON source.id = attempt.quiz_id
        JOIN zakat_academy_chapters parent ON parent.id = source.chapter_id
        WHERE attempt.profile_id IN (${Prisma.join(profileIds)})
          AND parent.course_id IN (${Prisma.join(courseIds)})
          AND attempt.is_completed = TRUE AND attempt.passed = TRUE
        GROUP BY attempt.profile_id, attempt.quiz_id
      ) a ON a.profile_id = e.profile_id AND a.quiz_id = q.id
      WHERE e.id IN (${Prisma.join(ids)})
      GROUP BY e.id
    `),
  ]);
  const lessonMap = new Map(lessons.map(item => [item.id, item]));
  const quizMap = new Map(quizzes.map(item => [item.id, item]));
  return enrollments.map(enrollment => {
    const lesson = lessonMap.get(enrollment.id);
    const quiz = quizMap.get(enrollment.id);
    const totalLessons = Number(lesson?.total ?? 0);
    const completedLessons = Number(lesson?.completed ?? 0);
    const totalQuizzes = Number(quiz?.total ?? 0);
    const passedQuizzes = Number(quiz?.passed ?? 0);
    const dates = [lesson?.finishedAt, quiz?.finishedAt].filter((date): date is Date => !!date);
    const isEligible = enrollment.course.isPublished && isCourseComplete(totalLessons, completedLessons, totalQuizzes, passedQuizzes);
    const completedAt = isEligible && dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : null;
    return { ...enrollment, totalLessons, completedLessons, totalQuizzes, passedQuizzes,
      percent: totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0,
      isEligible, completedAt,
    };
  });
}

function filters(search: string, program: string) {
  return {
    ...(search ? { profile: { OR: [
      { nis: { contains: search.slice(0, 100) } },
      { user: { name: { contains: search.slice(0, 100) } } },
      { user: { email: { contains: search.slice(0, 100) } } },
    ] } } : {}),
    ...(program ? { course: { title: { contains: program.slice(0, 100) } } } : {}),
  };
}

export async function listAdminEnrollments(search: string, program: string, requestedPage: number, db: Prisma.TransactionClient = prisma) {
  const where: Prisma.ZakatAcademyEnrollmentWhereInput = filters(search, program);
  const total = await db.zakatAcademyEnrollment.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(adminPage(requestedPage), pages);
  const enrollments = await db.zakatAcademyEnrollment.findMany({
    where, take: 20, skip: (page - 1) * 20, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: enrollmentSelect,
  });
  return { items: await progressFor(enrollments, db), total, page, pages };
}

export async function getAdminEnrollment(id: string, lessonPage: number, quizPage: number) {
  const enrollment = await prisma.zakatAcademyEnrollment.findUnique({ where: { id }, select: enrollmentSelect });
  if (!enrollment) return null;
  const lessonWhere = { isPublished: true, chapter: { courseId: enrollment.courseId, isPublished: true } };
  const quizWhere = { isPublished: true, chapter: { courseId: enrollment.courseId, isPublished: true } };
  const [progress, lessonCount, quizCount, record] = await Promise.all([
    progressFor([enrollment]), prisma.zakatAcademyLesson.count({ where: lessonWhere }),
    prisma.zakatAcademyQuiz.count({ where: quizWhere }),
    prisma.zakatAcademyCompletionRecord.findUnique({ where: { profileId_courseId: { profileId: enrollment.profileId, courseId: enrollment.courseId } },
      select: { id: true, isEligible: true, completedAt: true, certificateUrl: true } }),
  ]);
  const lessonPages = Math.max(1, Math.ceil(lessonCount / 20));
  const quizPages = Math.max(1, Math.ceil(quizCount / 20));
  const lp = Math.min(adminPage(lessonPage), lessonPages);
  const qp = Math.min(adminPage(quizPage), quizPages);
  const [lessons, quizzes] = await Promise.all([
    prisma.zakatAcademyLesson.findMany({ where: lessonWhere, take: 20, skip: (lp - 1) * 20,
      orderBy: [{ chapter: { order: "asc" } }, { chapterId: "asc" }, { order: "asc" }, { id: "asc" }],
      select: { id: true, title: true, chapter: { select: { title: true } },
        lessonProgress: { where: { profileId: enrollment.profileId }, select: { completed: true, completedAt: true } } },
    }),
    prisma.zakatAcademyQuiz.findMany({ where: quizWhere, take: 20, skip: (qp - 1) * 20,
      orderBy: [{ chapter: { order: "asc" } }, { chapterId: "asc" }, { id: "asc" }],
      select: { id: true, title: true, chapter: { select: { title: true } } },
    }),
  ]);
  const attempts = quizzes.length ? await prisma.zakatAcademyQuizAttempt.groupBy({
    by: ["quizId"], where: { profileId: enrollment.profileId, quizId: { in: quizzes.map(item => item.id) }, isCompleted: true },
    _max: { score: true, passed: true }, _count: { _all: true },
  }) : [];
  const attemptMap = new Map(attempts.map(item => [item.quizId, item]));
  return {
    ...progress[0], record,
    lessons: { items: lessons, page: lp, pages: lessonPages, total: lessonCount },
    quizzes: { items: quizzes.map(quiz => {
      const attempt = attemptMap.get(quiz.id);
      return { ...quiz, bestScore: attempt?._max.score == null ? null : Number(attempt._max.score), passed: attempt?._max.passed === true, completedAttempts: attempt?._count._all ?? 0 };
    }), page: qp, pages: quizPages, total: quizCount },
  };
}

const recordSelect = {
  id: true, profileId: true, courseId: true, isEligible: true, completedAt: true, certificateUrl: true, updatedAt: true,
  profile: { select: personSelect }, course: { select: courseSelect },
} satisfies Prisma.ZakatAcademyCompletionRecordSelect;

export async function listAdminCompletions(search: string, program: string, requestedPage: number, db: Prisma.TransactionClient = prisma) {
  const where: Prisma.ZakatAcademyCompletionRecordWhereInput = filters(search, program);
  const total = await db.zakatAcademyCompletionRecord.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(adminPage(requestedPage), pages);
  const records = await db.zakatAcademyCompletionRecord.findMany({
    where, take: 20, skip: (page - 1) * 20, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: recordSelect,
  });
  const enrollments = records.length ? await db.zakatAcademyEnrollment.findMany({
    where: { OR: records.map(({ profileId, courseId }) => ({ profileId, courseId })) }, select: enrollmentSelect,
  }) : [];
  const progress = new Map((await progressFor(enrollments, db)).map(item => [item.profileId + ":" + item.courseId, item]));
  return { items: records.map(record => ({ ...record, current: progress.get(record.profileId + ":" + record.courseId) ?? null })), total, page, pages };
}

export async function getAdminCompletion(id: string) {
  const record = await prisma.zakatAcademyCompletionRecord.findUnique({ where: { id }, select: recordSelect });
  if (!record) return null;
  const enrollment = await prisma.zakatAcademyEnrollment.findUnique({
    where: { profileId_courseId: { profileId: record.profileId, courseId: record.courseId } }, select: enrollmentSelect,
  });
  return { ...record, current: enrollment ? (await progressFor([enrollment]))[0] : null };
}

async function serialized<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let retry = 0; ; retry++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (retry < 2 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) continue;
      throw error;
    }
  }
}

async function currentCompletion(tx: Prisma.TransactionClient, enrollment: Enrollment) {
  const current = (await progressFor([enrollment], tx))[0];
  return { isEligible: current.isEligible && !!current.completedAt, completedAt: current.completedAt };
}

export async function syncAdminCompletion(enrollmentId: string) {
  return serialized(async tx => {
    const enrollment = await tx.zakatAcademyEnrollment.findUnique({ where: { id: enrollmentId }, select: enrollmentSelect });
    if (!enrollment) throw new AcademyError("Enrollment tidak ditemukan.");
    const data = await currentCompletion(tx, enrollment);
    return tx.zakatAcademyCompletionRecord.upsert({
      where: { profileId_courseId: { profileId: enrollment.profileId, courseId: enrollment.courseId } },
      create: { profileId: enrollment.profileId, courseId: enrollment.courseId, ...data }, update: data, select: { id: true },
    });
  });
}

export async function saveAdminCertificate(id: string, form: FormData) {
  const certificateUrl = certificateInput(form);
  await serialized(async tx => {
    const record = await tx.zakatAcademyCompletionRecord.findUnique({ where: { id }, select: { profileId: true, courseId: true } });
    if (!record) throw new AcademyError("Catatan kelulusan tidak ditemukan.");
    const enrollment = await tx.zakatAcademyEnrollment.findUnique({ where: { profileId_courseId: record }, select: enrollmentSelect });
    const current = enrollment ? await currentCompletion(tx, enrollment) : { isEligible: false, completedAt: null };
    if (certificateUrl && (!current.isEligible || !enrollment?.profile.user.isActive)) {
      throw new AcademyError("Tautan sertifikat hanya dapat diberikan kepada peserta aktif yang memenuhi syarat kelulusan saat ini.");
    }
    await tx.zakatAcademyCompletionRecord.update({ where: { id }, data: { ...current, certificateUrl } });
  });
}

export async function deleteAdminCompletion(id: string) {
  await prisma.zakatAcademyCompletionRecord.delete({ where: { id } });
}

export async function getAdminSettings(db: Prisma.TransactionClient = prisma) {
  const [setting, registration] = await Promise.all([
    db.zakatAcademySetting.findUnique({ where: { key: "maintenance_mode" }, select: { value: true } }),
    db.module.findUnique({ where: { slug: "academy" }, select: { isActive: true } }),
  ]);
  return { maintenance: setting?.value === "true", registered: !!registration, active: registration?.isActive ?? false };
}

export async function saveAdminMaintenance(form: FormData, db: Prisma.TransactionClient = prisma) {
  // Fixed allowlist: never accept an arbitrary setting key from the client.
  const value = form.get("maintenance") === "on" ? "true" : "false";
  await db.zakatAcademySetting.upsert({ where: { key: "maintenance_mode" }, create: { key: "maintenance_mode", value }, update: { value } });
}
