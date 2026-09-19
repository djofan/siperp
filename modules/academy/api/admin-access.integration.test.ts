import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

// Requires a running local Next server. Missing module registrations are temporary fixtures.
test("admin HTTP pages enforce current database access, including stale sessions", {
  skip: process.env.ACADEMY_HTTP_TEST !== "1", timeout: 240000,
}, async () => {
  loadEnvConfig(process.cwd());
  assert.notEqual(process.env.NODE_ENV, "production");
  const database = new URL(process.env.DATABASE_URL!);
  assert.equal(database.protocol, "mysql:");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(database.hostname));
  const base = new URL(process.env.ACADEMY_TEST_URL || "http://127.0.0.1:3002");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
  const { prisma } = await import("@/lib/prisma");
  const { createSessionToken, SESSION_COOKIE_NAME } = await import("@/lib/session");
  let userId: string | undefined;
  let courseId: string | undefined;
  let participantProfileId: string | undefined;
  const moduleIds: string[] = [];
  const suffix = randomUUID();
  try {
    let registration = await prisma.module.findUnique({ where: { slug: "academy" } });
    if (!registration) {
      registration = await prisma.module.create({ data: { slug: "academy", name: "Academy HTTP fixture", isActive: false } });
      moduleIds.push(registration.id);
    }
    const user = await prisma.user.create({ data: {
      name: "Academy HTTP fixture", email: suffix + "@academy-test.invalid", passwordHash: "disabled-test-login",
    } });
    userId = user.id;
    // Deliberately claims academy in the session before a DB grant, and after revocation.
    const token = await createSessionToken({ userId, name: user.name, isSuperadmin: false, moduleSlugs: ["academy"] });
    const request = async (path: string, authenticated = true) => {
      const response = await fetch(new URL(path, base), {
        redirect: "manual", signal: AbortSignal.timeout(60000),
        headers: authenticated ? { Cookie: SESSION_COOKIE_NAME + "=" + token } : {},
      });
      const body = await response.text();
      return { status: response.status, location: response.headers.get("location") || "", body };
    };
    const denied = (response: Awaited<ReturnType<typeof request>>, destination: string) => {
      assert.ok([303, 307].includes(response.status), "Expected redirect, got " + response.status);
      assert.ok(response.location.includes(destination), response.location);
      assert.ok(!response.body.includes("HTTP curriculum fixture " + suffix));
      assert.ok(!response.body.includes("Protected quiz question " + suffix));
    };
    denied(await request("/admin/academy/program/baru", false), "/admin/login");
    denied(await request("/admin/academy/program/baru"), "/admin?error=forbidden");
    const otherModule = await prisma.module.create({ data: { slug: "http-test-" + suffix, name: "Other module fixture", isActive: false } });
    moduleIds.push(otherModule.id);
    await prisma.moduleAccess.create({ data: { userId, moduleId: otherModule.id, role: "admin" } });
    denied(await request("/admin/academy/program"), "/admin?error=forbidden");
    const access = await prisma.moduleAccess.create({ data: { userId, moduleId: registration.id, role: "admin" } });
    const course = await prisma.zakatAcademyCourse.create({ data: {
      title: "HTTP curriculum fixture " + suffix, slug: "http-" + suffix, shortDescription: "Temporary fixture",
      chapters: { create: { title: "HTTP chapter", slug: "http-chapter", lessons: { create: {
        title: "HTTP lesson", slug: "http-lesson-" + suffix, videoProvider: "YOUTUBE", videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      } } } },
    }, include: { chapters: { include: { lessons: true } } } });
    courseId = course.id;
    const coursePath = "/admin/academy/program/" + course.id;
    const chapterPath = coursePath + "/bab/" + course.chapters[0].id;
    const lessonPath = chapterPath + "/materi/" + course.chapters[0].lessons[0].id;
    const quiz = await prisma.zakatAcademyQuiz.create({ data: {
      chapterId: course.chapters[0].id, title: "HTTP quiz fixture",
      questions: { create: { question: "Protected quiz question " + suffix, options: { create: [
        { label: "Answer A", isCorrect: true }, { label: "Answer B", isCorrect: false },
      ] } } },
    } });
    const quizPath = chapterPath + "/kuis/" + quiz.id;
    const profile = await prisma.zakatAcademyProfile.create({ data: { userId } });
    participantProfileId = profile.id;
    const enrollment = await prisma.zakatAcademyEnrollment.create({ data: { profileId: profile.id, courseId } });
    const completion = await prisma.zakatAcademyCompletionRecord.create({ data: { profileId: profile.id, courseId } });
    const participantPath = "/admin/academy/peserta/" + enrollment.id;
    const certificatePath = "/admin/academy/sertifikat/" + completion.id;
    for (const path of ["/admin/academy", "/admin/academy/program", "/admin/academy/program/baru", coursePath,
      coursePath + "/bab/baru", chapterPath, chapterPath + "/materi/baru", lessonPath,
      "/admin/academy/kuis", chapterPath + "/kuis/baru", quizPath,
      "/admin/academy/peserta", participantPath, "/admin/academy/sertifikat", certificatePath, "/admin/academy/pengaturan"]) {
      const response = await request(path);
      assert.equal(response.status, 200, path);
      assert.ok(response.body.includes("Program &amp; materi"), "Admin shell missing on " + path);
      assert.ok(!response.body.includes('NEXT_HTTP_ERROR_FALLBACK;500'), "Render failed on " + path);
    }
    await prisma.moduleAccess.update({ where: { id: access.id }, data: { role: "viewer" } });
    denied(await request(lessonPath), "/admin?error=forbidden");
    denied(await request(quizPath), "/admin?error=forbidden");
    for (const path of [participantPath, certificatePath, "/admin/academy/pengaturan"]) denied(await request(path), "/admin?error=forbidden");
    await prisma.moduleAccess.update({ where: { id: access.id }, data: { role: "admin" } });
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    denied(await request(coursePath), "/admin/login");
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    await prisma.moduleAccess.delete({ where: { id: access.id } });
    denied(await request(chapterPath), "/admin?error=forbidden");
    denied(await request(quizPath), "/admin?error=forbidden");
    for (const path of [participantPath, certificatePath, "/admin/academy/pengaturan"]) denied(await request(path), "/admin?error=forbidden");
  } finally {
    if (participantProfileId) {
      await prisma.zakatAcademyCompletionRecord.deleteMany({ where: { profileId: participantProfileId } });
      await prisma.zakatAcademyEnrollment.deleteMany({ where: { profileId: participantProfileId } });
      await prisma.zakatAcademyProfile.delete({ where: { id: participantProfileId } });
    }
    if (courseId) await prisma.zakatAcademyCourse.delete({ where: { id: courseId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (moduleIds.length) await prisma.module.deleteMany({ where: { id: { in: moduleIds } } });
    await prisma.$disconnect();
  }
});

test("participant HTTP responses hide answer keys before completion and deny other participants", {
  skip: process.env.ACADEMY_HTTP_TEST !== "1", timeout: 240000,
}, async (context) => {
  loadEnvConfig(process.cwd());
  assert.notEqual(process.env.NODE_ENV, "production");
  const database = new URL(process.env.DATABASE_URL!);
  assert.equal(database.protocol, "mysql:");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(database.hostname));
  const base = new URL(process.env.ACADEMY_TEST_URL || "http://127.0.0.1:3002");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
  const { prisma } = await import("@/lib/prisma");
  const { createSessionToken, SESSION_COOKIE_NAME } = await import("@/lib/session");
  const { startQuiz, updateAttempt } = await import("./quizzes");
  let temporaryModule: string | undefined;
  let courseId: string | undefined;
  const users: string[] = [];
  const profiles: string[] = [];
  const suffix = randomUUID();
  try {
    const registration = await prisma.module.findUnique({ where: { slug: "academy" } });
    const maintenance = await prisma.zakatAcademySetting.findUnique({ where: { key: "maintenance_mode" } });
    if ((registration && !registration.isActive) || maintenance?.value === "true") {
      context.skip("Public academy is disabled; the test does not change existing settings.");
      return;
    }
    if (!registration) temporaryModule = (await prisma.module.create({ data: { slug: "academy", name: "HTTP participant fixture", isActive: true } })).id;
    const tokens: string[] = [];
    for (let index = 0; index < 2; index++) {
      const user = await prisma.user.create({ data: { name: "HTTP learner fixture", email: index + "-" + suffix + "@academy-test.invalid", passwordHash: "disabled-test-login" } });
      users.push(user.id);
      profiles.push((await prisma.zakatAcademyProfile.create({ data: { userId: user.id } })).id);
      tokens.push(await createSessionToken({ userId: user.id, name: user.name, isSuperadmin: false, moduleSlugs: [] }));
    }
    const course = await prisma.zakatAcademyCourse.create({ data: {
      title: "HTTP participant fixture", slug: "http-participant-" + suffix, shortDescription: "Fixture", isPublished: true,
      chapters: { create: { title: "Fixture", slug: "fixture", isPublished: true, quizzes: { create: {
        title: "HTTP public quiz", isPublished: true, isActive: true, timeLimitMinutes: 60,
        questions: { create: { question: "Private attempt question " + suffix, options: { create: [
          { label: "Fixture option A", isCorrect: true }, { label: "Fixture option B", isCorrect: false },
        ] } } },
      } } } },
    }, include: { chapters: { include: { quizzes: true } } } });
    courseId = course.id;
    await prisma.zakatAcademyEnrollment.createMany({ data: profiles.map(profileId => ({ profileId, courseId: course.id })) });
    const quizId = course.chapters[0].quizzes[0].id;
    const attemptId = await startQuiz(profiles[0], quizId);
    const attemptPath = `/academy/kuis/${quizId}/percobaan/${attemptId}`;
    const resultPath = `/academy/kuis/${quizId}/hasil/${attemptId}`;
    const request = async (path: string, index = 0) => {
      const response = await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(60000), headers: { Cookie: SESSION_COOKIE_NAME + "=" + tokens[index] } });
      return { status: response.status, location: response.headers.get("location") ?? "", body: await response.text() };
    };
    const active = await request(attemptPath);
    assert.equal(active.status, 200);
    assert.ok(active.body.includes("Private attempt question " + suffix));
    assert.ok(!active.body.includes("isCorrect"));
    assert.ok(!active.body.includes("Jawaban benar"));
    const unfinishedResult = await request(resultPath);
    assert.ok(unfinishedResult.location.includes(attemptPath) || unfinishedResult.body.includes("NEXT_REDIRECT"));
    assert.ok(!unfinishedResult.body.includes("Jawaban benar"));
    for (const path of [attemptPath, resultPath]) {
      const other = await request(path, 1);
      assert.ok(other.status === 404 || other.body.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
      assert.ok(!other.body.includes("Private attempt question " + suffix));
      assert.ok(!other.body.includes("isCorrect"));
    }
    await updateAttempt(profiles[0], attemptId, undefined, true);
    const finished = await request(resultPath);
    assert.equal(finished.status, 200);
    assert.ok(finished.body.includes("Jawaban benar"));
    const otherFinished = await request(resultPath, 1);
    assert.ok(!otherFinished.body.includes("Private attempt question " + suffix));
    assert.ok(!otherFinished.body.includes("Jawaban benar"));
  } finally {
    if (profiles.length) {
      await prisma.zakatAcademyQuizAttempt.deleteMany({ where: { profileId: { in: profiles } } });
      await prisma.zakatAcademyEnrollment.deleteMany({ where: { profileId: { in: profiles } } });
      await prisma.zakatAcademyProfile.deleteMany({ where: { id: { in: profiles } } });
    }
    if (courseId) await prisma.zakatAcademyCourse.delete({ where: { id: courseId } });
    if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } });
    if (temporaryModule) await prisma.module.delete({ where: { id: temporaryModule } });
    await prisma.$disconnect();
  }
});
