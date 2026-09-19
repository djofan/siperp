import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

test("MySQL quiz CRUD preserves in-flight snapshots and grades against the original answer key", {
  skip: process.env.ACADEMY_MYSQL_TEST !== "1", timeout: 60000,
}, async () => {
  loadEnvConfig(process.cwd());
  assert.notEqual(process.env.NODE_ENV, "production");
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.protocol, "mysql:");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  const { prisma } = await import("@/lib/prisma");
  const admin = await import("./admin-quizzes");
  const { startQuiz, updateAttempt, getOwnAttempt } = await import("./quizzes");
  const { readSnapshot } = await import("./policy");
  const suffix = randomUUID();
  let courseId: string | undefined;
  let userId: string | undefined;
  let profileId: string | undefined;
  const form = (values: Record<string, string>) => {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    return data;
  };
  const settings = { title: "Quiz fixture " + suffix, passingScore: "70", timeLimitMinutes: "10", allowRetake: "on" };
  const published = { ...settings, isPublished: "on", isActive: "on" };
  const questionForm = (question: string, order: string) => form({ question, order, options: JSON.stringify([
    { id: "", label: "Original correct", isCorrect: true }, { id: "", label: "Original wrong", isCorrect: false },
  ]) });
  try {
    const course = await prisma.zakatAcademyCourse.create({ data: {
      title: "Quiz fixture", slug: "quiz-test-" + suffix, shortDescription: "Fixture", isPublished: true,
      chapters: { create: { title: "Quiz chapter", slug: "quiz-chapter", isPublished: true } },
    }, include: { chapters: true } });
    courseId = course.id;
    const chapterId = course.chapters[0].id;
    const user = await prisma.user.create({ data: { name: "Quiz fixture", email: suffix + "@academy-test.invalid", passwordHash: "disabled-test-login" } });
    userId = user.id;
    const profile = await prisma.zakatAcademyProfile.create({ data: { userId } });
    profileId = profile.id;
    await prisma.zakatAcademyEnrollment.create({ data: { profileId, courseId } });
    await assert.rejects(admin.saveAdminQuiz(courseId, chapterId, null, form(published)), /draft/);
    const quiz = await admin.saveAdminQuiz(courseId, chapterId, null, form(settings));
    await assert.rejects(admin.saveAdminQuiz(courseId, chapterId, quiz.id, form(published)), /minimal satu/);
    const first = await admin.saveAdminQuestion(courseId, chapterId, quiz.id, null, questionForm("First original question", "5"));
    const second = await admin.saveAdminQuestion(courseId, chapterId, quiz.id, null, questionForm("Second original question", "1"));
    assert.deepEqual((await admin.getAdminQuiz(courseId, chapterId, quiz.id))?.questions.map(item => item.id), [second.id, first.id]);
    await admin.saveAdminQuiz(courseId, chapterId, quiz.id, form(published));
    const attemptId = await startQuiz(profileId, quiz.id);
    const original = await prisma.zakatAcademyQuizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    const snapshot = readSnapshot(original.answers);
    const originalFirst = snapshot.questions.find(item => item.id === first.id)!;
    const originalSecond = snapshot.questions.find(item => item.id === second.id)!;
    await assert.rejects(admin.saveAdminQuestion("wrong-course", chapterId, quiz.id, first.id, questionForm("Wrong", "0")), /Kuis tidak ditemukan/);
    const foreignOptions = form({ question: "Bad replacement", order: "0", options: JSON.stringify(originalSecond.options) });
    await assert.rejects(admin.saveAdminQuestion(courseId, chapterId, quiz.id, first.id, foreignOptions), /Opsi bukan milik/);
    await assert.rejects(admin.saveAdminQuestion(courseId, chapterId, quiz.id, second.id + "-invalid", questionForm("Missing", "0")), /Pertanyaan tidak ditemukan/);
    await admin.saveAdminQuestion(courseId, chapterId, quiz.id, first.id, form({
      question: "Edited question", order: "9", options: JSON.stringify(originalFirst.options.map(option => ({ ...option, isCorrect: !option.isCorrect }))),
    }));
    await admin.deleteAdminQuestion(courseId, chapterId, quiz.id, second.id);
    await admin.saveAdminQuiz(courseId, chapterId, quiz.id, form({ ...published, passingScore: "100", timeLimitMinutes: "20" }));
    const unchanged = await prisma.zakatAcademyQuizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    assert.deepEqual(unchanged, original);
    assert.equal(await getOwnAttempt("other-profile", quiz.id, attemptId), null);
    await assert.rejects(updateAttempt("other-profile", attemptId, undefined, true), /Percobaan tidak ditemukan/);
    for (const question of snapshot.questions) await updateAttempt(profileId, attemptId, {
      questionId: question.id, optionId: question.options.find(option => option.isCorrect)!.id,
    });
    await updateAttempt(profileId, attemptId, undefined, true);
    const completed = await prisma.zakatAcademyQuizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    assert.equal(Number(completed.score), 100);
    assert.equal(completed.passed, true);
    assert.deepEqual(readSnapshot(completed.answers).questions, snapshot.questions);
    const nextAttemptId = await startQuiz(profileId, quiz.id);
    const next = await prisma.zakatAcademyQuizAttempt.findUniqueOrThrow({ where: { id: nextAttemptId } });
    const nextSnapshot = readSnapshot(next.answers);
    assert.equal(nextSnapshot.questions.length, 1);
    assert.equal(nextSnapshot.questions[0].question, "Edited question");
    assert.equal(nextSnapshot.passingScore, 100);
    assert.equal(nextSnapshot.timeLimitMinutes, 20);
    await updateAttempt(profileId, nextAttemptId, { questionId: first.id, optionId: originalFirst.options.find(option => option.isCorrect)!.id }, true);
    assert.equal(Number((await prisma.zakatAcademyQuizAttempt.findUniqueOrThrow({ where: { id: nextAttemptId } })).score), 0);
    await assert.rejects(admin.deleteAdminQuestion(courseId, chapterId, quiz.id, first.id), /minimal satu/);
    assert.equal((await admin.getAdminQuiz(courseId, chapterId, quiz.id))?.questions.length, 1);
    await assert.rejects(admin.deleteAdminQuiz(courseId, chapterId, quiz.id), /sudah memiliki percobaan/);
    await admin.saveAdminQuiz(courseId, chapterId, quiz.id, form(settings));
    await admin.deleteAdminQuestion(courseId, chapterId, quiz.id, first.id);
    assert.deepEqual((await prisma.zakatAcademyQuizAttempt.findUniqueOrThrow({ where: { id: attemptId } })).answers, completed.answers);
    const unused = await admin.saveAdminQuiz(courseId, chapterId, null, form(settings));
    await admin.deleteAdminQuiz(courseId, chapterId, unused.id);
    assert.equal(await admin.getAdminQuiz(courseId, chapterId, unused.id), null);
    const listing = await admin.listAdminQuizzes(suffix, 1);
    assert.equal(listing.items.length, 1);
    assert.equal("answers" in listing.items[0], false);
    assert.equal("questions" in listing.items[0], false);
  } finally {
    if (profileId) {
      await prisma.zakatAcademyQuizAttempt.deleteMany({ where: { profileId } });
      await prisma.zakatAcademyEnrollment.deleteMany({ where: { profileId } });
      await prisma.zakatAcademyProfile.delete({ where: { id: profileId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (courseId) await prisma.zakatAcademyCourse.delete({ where: { id: courseId } });
    await prisma.$disconnect();
  }
});
