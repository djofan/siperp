import "server-only";
import { prisma } from "@/lib/prisma";
import { isCourseComplete } from "./policy";

export async function listPublicCourses(search = "", take?: number) {
  return prisma.zakatAcademyCourse.findMany({
    where: { isPublished: true, ...(search ? { title: { contains: search.slice(0, 100) } } : {}) },
    orderBy: [{ order: "asc" }, { id: "asc" }], take,
    select: {
      id: true, title: true, slug: true, shortDescription: true, thumbnailUrl: true,
      chapters: { where: { isPublished: true }, select: { _count: { select: { lessons: { where: { isPublished: true } } } } } },
    },
  });
}

export async function getPublicCourse(slug: string) {
  return prisma.zakatAcademyCourse.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true, slug: true, title: true, shortDescription: true, description: true, thumbnailUrl: true,
      chapters: {
        where: { isPublished: true }, orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { id: true, title: true, description: true,
          lessons: { where: { isPublished: true }, orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, title: true, slug: true } },
          quizzes: { where: { isPublished: true }, select: { id: true, title: true } },
        },
      },
    },
  });
}

export async function getEnrollment(profileId: string | undefined, courseId: string) {
  if (!profileId) return null;
  return prisma.zakatAcademyEnrollment.findUnique({ where: { profileId_courseId: { profileId, courseId } } });
}

export async function getLearningOverview(profileId: string) {
  const [enrollments, progress, attempts] = await Promise.all([
    prisma.zakatAcademyEnrollment.findMany({
      where: { profileId, course: { isPublished: true } }, orderBy: { createdAt: "desc" },
      select: { createdAt: true, course: { select: { id: true, slug: true, title: true,
        chapters: { where: { isPublished: true }, select: {
          lessons: { where: { isPublished: true }, select: { id: true } },
          quizzes: { where: { isPublished: true }, select: { id: true } },
        } },
      } } },
    }),
    prisma.zakatAcademyLessonProgress.findMany({ where: { profileId, completed: true }, select: { lessonId: true, completedAt: true } }),
    prisma.zakatAcademyQuizAttempt.findMany({ where: { profileId, isCompleted: true }, select: { quizId: true, passed: true, score: true, submittedAt: true } }),
  ]);
  const completed = new Set(progress.map((item) => item.lessonId));
  const passed = new Set(attempts.filter((item) => item.passed).map((item) => item.quizId));
  return enrollments.map(({ course, createdAt }) => {
    const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
    const quizzes = course.chapters.flatMap((chapter) => chapter.quizzes);
    const completedLessons = lessons.filter((lesson) => completed.has(lesson.id)).length;
    const passedQuizzes = quizzes.filter((quiz) => passed.has(quiz.id)).length;
    const dates = [
      ...progress.filter((item) => lessons.some((lesson) => lesson.id === item.lessonId)).map((item) => item.completedAt),
      ...quizzes.map((quiz) => attempts.filter((item) => item.quizId === quiz.id && item.passed && item.submittedAt).sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime())[0]?.submittedAt),
    ].filter((date): date is Date => !!date);
    return { id: course.id, title: course.title, slug: course.slug, enrolledAt: createdAt,
      totalLessons: lessons.length, completedLessons, totalQuizzes: quizzes.length, passedQuizzes,
      percent: lessons.length ? Math.round(completedLessons / lessons.length * 100) : 0,
      isEligible: isCourseComplete(lessons.length, completedLessons, quizzes.length, passedQuizzes),
      completedAt: dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null,
    };
  });
}

export async function listParticipantQuizzes(profileId: string) {
  return prisma.zakatAcademyQuiz.findMany({
    where: { isPublished: true, chapter: { isPublished: true, course: { isPublished: true, enrollments: { some: { profileId } } } } },
    select: { id: true, title: true, isActive: true, quizDate: true, timeLimitMinutes: true, passingScore: true, allowRetake: true,
      chapter: { select: { title: true } }, _count: { select: { questions: true } },
      attempts: { where: { profileId }, orderBy: { attemptNumber: "desc" }, select: { id: true, attemptNumber: true, isCompleted: true, score: true, passed: true } },
    }, orderBy: [{ quizDate: "desc" }, { id: "asc" }],
  });
}

export async function getLeaderboard() {
  const attempts = await prisma.zakatAcademyQuizAttempt.findMany({
    where: { isCompleted: true, profile: { user: { isActive: true } }, quiz: { isPublished: true, chapter: { isPublished: true, course: { isPublished: true } } } },
    select: { profileId: true, quizId: true, score: true, profile: { select: { user: { select: { name: true } } } } },
  });
  const people = new Map<string, { id: string; name: string; scores: Map<string, number> }>();
  for (const attempt of attempts) {
    const person = people.get(attempt.profileId) ?? { id: attempt.profileId, name: attempt.profile.user.name, scores: new Map<string, number>() };
    person.scores.set(attempt.quizId, Math.max(person.scores.get(attempt.quizId) ?? 0, Number(attempt.score ?? 0)));
    people.set(person.id, person);
  }
  return Array.from(people.values()).map((person) => ({ id: person.id, name: person.name, total: person.scores.size,
    average: [...person.scores.values()].reduce((sum, score) => sum + score, 0) / person.scores.size,
  })).sort((a, b) => b.average - a.average || b.total - a.total || a.id.localeCompare(b.id));
}
