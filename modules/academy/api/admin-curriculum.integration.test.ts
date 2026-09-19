import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";

// Opt-in: creates isolated fixtures and removes only those fixtures.
test("MySQL curriculum CRUD, ordering, ownership and enrollment protection", {
  skip: process.env.ACADEMY_MYSQL_TEST !== "1", timeout: 60000,
}, async () => {
  loadEnvConfig(process.cwd());
  assert.notEqual(process.env.NODE_ENV, "production");
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.protocol, "mysql:");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Use a local development MySQL database");
  const { prisma } = await import("@/lib/prisma");
  const service = await import("./admin-curriculum");
  const suffix = randomUUID();
  const ids: string[] = [];
  let userId: string | undefined;
  let profileId: string | undefined;
  const form = (values: Record<string, string>) => {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    return data;
  };
  const content = (slug: string) => ({ title: "Academy integration fixture", slug: slug + "-" + suffix, order: "0" });
  try {
    const course = await service.saveCourse(null, form({ ...content("course"), shortDescription: "Fixture" }));
    ids.push(course.id);
    const other = await service.saveCourse(null, form({ ...content("other"), shortDescription: "Fixture" }));
    ids.push(other.id);
    await service.saveCourse(course.id, form({ ...content("course"), title: "Updated fixture", shortDescription: "Fixture", isPublished: "on" }));
    assert.equal((await service.getAdminCourse(course.id))?.title, "Updated fixture");
    const chapter = await service.saveChapter(course.id, null, form(content("chapter")));
    const second = await service.saveChapter(course.id, null, form({ ...content("second"), order: "1" }));
    await service.setContentOrder(course.id, chapter.id, null, 5);
    assert.deepEqual((await service.getAdminCourse(course.id))?.chapters.map(item => item.id), [second.id, chapter.id]);
    const lessonForm = form({ ...content("lesson"), videoProvider: "YOUTUBE", videoUrl: "https://youtu.be/dQw4w9WgXcQ" });
    const lesson = await service.saveLesson(course.id, chapter.id, null, lessonForm);
    await service.saveChapter(course.id, chapter.id, form({ ...content("chapter"), title: "Updated chapter" }));
    await service.saveLesson(course.id, chapter.id, lesson.id, lessonForm);
    await service.setContentOrder(course.id, chapter.id, lesson.id, 10);
    assert.equal((await service.getAdminLesson(course.id, chapter.id, lesson.id))?.order, 10);
    await assert.rejects(service.saveLesson(other.id, chapter.id, lesson.id, lessonForm), /Bab tidak ditemukan/);
    assert.equal(await service.getAdminLesson(other.id, chapter.id, lesson.id), null);
    const attachmentForm = form({ title: "Fixture file", fileUrl: "https://example.com/fixture.pdf" });
    const attachment = await service.saveAttachment(course.id, chapter.id, lesson.id, null, attachmentForm);
    await service.saveAttachment(course.id, chapter.id, lesson.id, attachment.id, form({ title: "Updated file", fileUrl: "/fixture.pdf" }));
    assert.equal((await service.getAdminLesson(course.id, chapter.id, lesson.id))?.attachments[0].title, "Updated file");
    await assert.rejects(service.deleteAttachment(other.id, chapter.id, lesson.id, attachment.id), /Materi tidak ditemukan/);
    await service.deleteAttachment(course.id, chapter.id, lesson.id, attachment.id);
    assert.equal((await service.getAdminLesson(course.id, chapter.id, lesson.id))?.attachments.length, 0);
    const user = await prisma.user.create({ data: { name: "Academy test fixture", email: suffix + "@academy-test.invalid", passwordHash: "disabled-test-login" } });
    userId = user.id;
    const profile = await prisma.zakatAcademyProfile.create({ data: { userId } });
    profileId = profile.id;
    await prisma.zakatAcademyEnrollment.create({ data: { profileId, courseId: course.id } });
    for (const [chapterId, lessonId] of [[null, null], [chapter.id, null], [chapter.id, lesson.id]]) {
      await assert.rejects(service.deleteContent(course.id, chapterId, lessonId), /sudah memiliki peserta/);
    }
    await prisma.zakatAcademyEnrollment.deleteMany({ where: { profileId } });
    await service.deleteContent(course.id, chapter.id, lesson.id);
    await service.deleteContent(course.id, chapter.id, null);
    await service.deleteContent(course.id, null, null);
    assert.equal(await service.getAdminCourse(course.id), null);
  } finally {
    if (profileId) {
      await prisma.zakatAcademyEnrollment.deleteMany({ where: { profileId } });
      await prisma.zakatAcademyProfile.delete({ where: { id: profileId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (ids.length) await prisma.zakatAcademyCourse.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
