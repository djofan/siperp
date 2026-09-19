import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

test("MySQL participant aggregates, bounded queries and certificate eligibility", {
  skip: process.env.ACADEMY_MYSQL_TEST !== "1", timeout: 120000,
}, async () => {
  loadEnvConfig(process.cwd());
  assert.notEqual(process.env.NODE_ENV, "production");
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.protocol, "mysql:");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  const { prisma } = await import("@/lib/prisma");
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const observed = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!), log: [{ emit: "event", level: "query" }] });
  let queries: string[] = [];
  observed.$on("query", event => queries.push(event.query));
  const service = await import("./admin-participants");
  const { getLearningOverview } = await import("./courses");
  const suffix = randomUUID();
  const users = Array.from({ length: 22 }, (_, i) => "user-" + suffix + "-" + i);
  const profiles = users.map((_, i) => "profile-" + suffix + "-" + i);
  const enrollments = users.map((_, i) => "enrollment-" + suffix + "-" + i);
  let courseId: string | undefined;
  const form = (certificateUrl: string) => {
    const data = new FormData();
    data.set("certificateUrl", certificateUrl);
    data.set("isEligible", "true"); // Must not override calculated status.
    return data;
  };
  try {
    const course = await prisma.zakatAcademyCourse.create({ data: {
      title: "Participant fixture " + suffix, slug: "participant-" + suffix, shortDescription: "Fixture", isPublished: true,
      chapters: { create: { title: "Fixture chapter", slug: "fixture", isPublished: true,
        lessons: { create: [
          { title: "Published", slug: "published-" + suffix, isPublished: true, videoProvider: "YOUTUBE", videoUrl: "https://youtu.be/dQw4w9WgXcQ" },
          { title: "Draft", slug: "draft-" + suffix, isPublished: false, videoProvider: "YOUTUBE", videoUrl: "https://youtu.be/dQw4w9WgXcQ" },
        ] }, quizzes: { create: [
          { title: "Quiz one", isPublished: true }, { title: "Quiz two", isPublished: true }, { title: "Draft quiz", isPublished: false },
        ] },
      } },
    }, include: { chapters: { include: { lessons: true, quizzes: true } } } });
    courseId = course.id;
    const lesson = course.chapters[0].lessons.find(item => item.isPublished)!;
    const quizIds = course.chapters[0].quizzes.filter(item => item.isPublished).map(item => item.id);
    await prisma.user.createMany({ data: users.map((id, i) => ({ id, name: "Fixture " + suffix + "-" + i, email: id + "@academy-test.invalid", passwordHash: "disabled-test-login" })) });
    await prisma.zakatAcademyProfile.createMany({ data: profiles.map((id, i) => ({ id, userId: users[i] })) });
    await prisma.zakatAcademyEnrollment.createMany({ data: enrollments.map((id, i) => ({ id, profileId: profiles[i], courseId: course.id })) });
    const lessonDate = new Date("2026-01-03T00:00:00.000Z");
    await prisma.zakatAcademyLessonProgress.createMany({ data: profiles.slice(0, 2).map(profileId => ({ profileId, lessonId: lesson.id, completed: true, completedAt: lessonDate })) });
    await prisma.zakatAcademyQuizAttempt.createMany({ data: [
      { profileId: profiles[0], quizId: quizIds[0], attemptNumber: 1, passed: true, isCompleted: true, score: 80, submittedAt: new Date("2026-01-01T00:00:00Z") },
      { profileId: profiles[1], quizId: quizIds[0], attemptNumber: 1, passed: true, isCompleted: true, score: 75, submittedAt: new Date("2026-01-01T00:00:00Z") },
      { profileId: profiles[1], quizId: quizIds[0], attemptNumber: 2, passed: true, isCompleted: true, score: 95, submittedAt: new Date("2026-01-10T00:00:00Z") },
      { profileId: profiles[1], quizId: quizIds[1], attemptNumber: 1, passed: true, isCompleted: true, score: 90, submittedAt: new Date("2026-01-02T00:00:00Z") },
    ].map(item => ({ ...item, answers: { secretMarker: "must-not-leak" } })) });
    const incomplete = await service.getAdminEnrollment(enrollments[0], 1, 1);
    assert.equal(incomplete?.totalLessons, 1);
    assert.equal(incomplete?.totalQuizzes, 2);
    assert.equal(incomplete?.passedQuizzes, 1);
    assert.equal(incomplete?.isEligible, false);
    const complete = await service.getAdminEnrollment(enrollments[1], 1, 1);
    assert.equal(complete?.passedQuizzes, 2);
    assert.equal(complete?.isEligible, true);
    assert.equal(complete?.completedAt?.toISOString(), lessonDate.toISOString());
    assert.equal(complete?.quizzes.items.find(item => item.id === quizIds[0])?.bestScore, 95);
    assert.equal(JSON.stringify(complete).includes("must-not-leak"), false);
    assert.equal((await getLearningOverview(profiles[1]))[0].completedAt?.toISOString(), complete?.completedAt?.toISOString());
    assert.equal(await service.getAdminEnrollment("missing", 1, 1), null);

    queries = [];
    const one = await service.listAdminEnrollments(users[0] + "@", suffix, 1, observed);
    const oneCount = queries.length;
    assert.equal(one.items.length, 1);
    queries = [];
    const many = await service.listAdminEnrollments(suffix, suffix, 1, observed);
    assert.equal(many.items.length, 20);
    assert.equal(many.total, 22);
    assert.ok(oneCount > 0 && oneCount <= 12);
    assert.equal(queries.length, oneCount, "SQL query count must not grow with rows");
    assert.ok(!queries.some(query => /\banswers\b/i.test(query)));
    const next = await service.listAdminEnrollments(suffix, suffix, 2);
    assert.equal(next.items.length, 2);
    assert.equal(new Set([...many.items, ...next.items].map(item => item.id)).size, 22);

    await prisma.zakatAcademyCompletionRecord.createMany({ data: profiles.map(profileId => ({ profileId, courseId: course.id, isEligible: true, completedAt: lessonDate })) });
    queries = [];
    await service.listAdminCompletions(users[0] + "@", suffix, 1, observed);
    const singleRecordQueries = queries.length;
    queries = [];
    const records = await service.listAdminCompletions(suffix, suffix, 1, observed);
    assert.equal(records.items.length, 20);
    assert.equal(queries.length, singleRecordQueries);
    assert.ok(singleRecordQueries <= 14);
    const record = await service.syncAdminCompletion(enrollments[0]);
    assert.equal((await service.getAdminCompletion(record.id))?.isEligible, false);
    await assert.rejects(service.saveAdminCertificate(record.id, form("https://example.com/not-earned.pdf")), /syarat kelulusan/);
    const earned = await service.syncAdminCompletion(enrollments[1]);
    await service.saveAdminCertificate(earned.id, form("https://example.com/earned.pdf"));
    assert.equal((await service.getAdminCompletion(earned.id))?.certificateUrl, "https://example.com/earned.pdf");
    await assert.rejects(service.saveAdminCertificate(earned.id, form("javascript:alert(1)")));
    const draftLesson = course.chapters[0].lessons.find(item => !item.isPublished)!;
    await prisma.zakatAcademyLesson.update({ where: { id: draftLesson.id }, data: { isPublished: true } });
    assert.equal((await service.getAdminCompletion(earned.id))?.current?.isEligible, false);
    await assert.rejects(service.saveAdminCertificate(earned.id, form("/outdated-curriculum.pdf")), /syarat kelulusan/);
    await prisma.zakatAcademyLesson.update({ where: { id: draftLesson.id }, data: { isPublished: false } });
    await prisma.zakatAcademyCourse.update({ where: { id: courseId }, data: { isPublished: false } });
    await assert.rejects(service.saveAdminCertificate(earned.id, form("/draft-course.pdf")), /syarat kelulusan/);
    await prisma.zakatAcademyCourse.update({ where: { id: courseId }, data: { isPublished: true } });
    await prisma.user.update({ where: { id: users[1] }, data: { isActive: false } });
    await assert.rejects(service.saveAdminCertificate(earned.id, form("https://example.com/earned.pdf")), /peserta aktif/);
    await prisma.user.update({ where: { id: users[1] }, data: { isActive: true } });
    await prisma.zakatAcademyLessonProgress.update({ where: { profileId_lessonId: { profileId: profiles[1], lessonId: lesson.id } }, data: { completed: false } });
    assert.equal((await service.getAdminCompletion(earned.id))?.current?.isEligible, false);
    await service.syncAdminCompletion(enrollments[1]);
    assert.equal((await service.getAdminCompletion(earned.id))?.isEligible, false);
    assert.equal((await service.getAdminCompletion(earned.id))?.completedAt, null);
    assert.equal((await getLearningOverview(profiles[1]))[0].isEligible, false);
    await service.saveAdminCertificate(earned.id, form(""));
    assert.equal((await service.getAdminCompletion(earned.id))?.certificateUrl, null);
    await prisma.zakatAcademyEnrollment.delete({ where: { id: enrollments[21] } });
    const orphan = await prisma.zakatAcademyCompletionRecord.findUniqueOrThrow({ where: { profileId_courseId: { profileId: profiles[21], courseId } } });
    assert.equal((await service.getAdminCompletion(orphan.id))?.current, null);
    await assert.rejects(service.saveAdminCertificate(orphan.id, form("/orphan.pdf")), /syarat kelulusan/);
    await service.saveAdminCertificate(orphan.id, form(""));
    await service.deleteAdminCompletion(orphan.id);
    assert.equal(await service.getAdminCompletion(orphan.id), null);
    // Progress and quiz history survive completion-record deletion.
    await service.deleteAdminCompletion(earned.id);
    assert.equal(await prisma.zakatAcademyQuizAttempt.count({ where: { profileId: profiles[1] } }), 3);
    await prisma.zakatAcademyLesson.createMany({ data: Array.from({ length: 21 }, (_, i) => ({
      chapterId: course.chapters[0].id, title: "Page lesson " + i, slug: "page-" + suffix + "-" + i,
      isPublished: true, videoProvider: "YOUTUBE" as const, videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    })) });
    await prisma.zakatAcademyQuiz.createMany({ data: Array.from({ length: 21 }, (_, i) => ({
      chapterId: course.chapters[0].id, title: "Page quiz " + i, isPublished: true,
    })) });
    const firstDetails = await service.getAdminEnrollment(enrollments[0], 1, 1);
    const secondDetails = await service.getAdminEnrollment(enrollments[0], 2, 2);
    assert.equal(firstDetails?.lessons.items.length, 20);
    assert.equal(secondDetails?.lessons.items.length, 2);
    assert.equal(firstDetails?.quizzes.items.length, 20);
    assert.equal(secondDetails?.quizzes.items.length, 3);
    // Validate settings inside a rolled-back transaction: no public maintenance outage.
    const beforeSetting = await prisma.zakatAcademySetting.findUnique({ where: { key: "maintenance_mode" } });
    const rollback = new Error("rollback fixture settings");
    await assert.rejects(prisma.$transaction(async tx => {
      const settingForm = new FormData();
      settingForm.set("maintenance", "on");
      settingForm.set("key", "unapproved-" + suffix);
      await service.saveAdminMaintenance(settingForm, tx);
      assert.equal((await service.getAdminSettings(tx)).maintenance, true);
      assert.equal(await tx.zakatAcademySetting.findUnique({ where: { key: "unapproved-" + suffix } }), null);
      await service.saveAdminMaintenance(new FormData(), tx);
      assert.equal((await service.getAdminSettings(tx)).maintenance, false);
      throw rollback;
    }), error => error === rollback);
    assert.deepEqual(await prisma.zakatAcademySetting.findUnique({ where: { key: "maintenance_mode" } }), beforeSetting);
    console.log("SQL queries per list: enrollments=" + oneCount + ", completions=" + singleRecordQueries + " (1 vs 20 rows unchanged)");
  } finally {
    await prisma.zakatAcademyQuizAttempt.deleteMany({ where: { profileId: { in: profiles } } });
    await prisma.zakatAcademyLessonProgress.deleteMany({ where: { profileId: { in: profiles } } });
    await prisma.zakatAcademyCompletionRecord.deleteMany({ where: { profileId: { in: profiles } } });
    await prisma.zakatAcademyEnrollment.deleteMany({ where: { profileId: { in: profiles } } });
    await prisma.zakatAcademyProfile.deleteMany({ where: { id: { in: profiles } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    if (courseId) await prisma.zakatAcademyCourse.delete({ where: { id: courseId } });
    await observed.$disconnect();
    await prisma.$disconnect();
  }
});
