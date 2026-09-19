import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AcademyError } from "./errors";
import { courseInput, chapterInput, lessonInput, attachmentInput } from "./admin-validation";

// Service internal: setiap pemanggil halaman/Server Action wajib requireAcademyAdmin().
// Jangan diekspor sebagai endpoint publik atau mengirim record kuis/snapshot ke client.
export async function curriculumStats() {
  const [courses, published, chapters, lessons] = await Promise.all([
    prisma.zakatAcademyCourse.count(),
    prisma.zakatAcademyCourse.count({ where: { isPublished: true } }),
    prisma.zakatAcademyChapter.count(),
    prisma.zakatAcademyLesson.count(),
  ]);
  return { courses, published, chapters, lessons };
}

export async function listAdminCourses(search: string, status: string, requestedPage: number) {
  const where: Prisma.ZakatAcademyCourseWhereInput = {
    ...(search ? { title: { contains: search.slice(0, 100) } } : {}),
    ...(status === "published" ? { isPublished: true } : status === "draft" ? { isPublished: false } : {}),
  };
  const pageSize = 20;
  const total = await prisma.zakatAcademyCourse.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const items = await prisma.zakatAcademyCourse.findMany({
    where, take: pageSize, skip: (page - 1) * pageSize,
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, title: true, slug: true, order: true, isPublished: true,
      _count: { select: { chapters: true, enrollments: true } } },
  });
  return { items, page, pages, total };
}

export async function getAdminCourse(id: string) {
  return prisma.zakatAcademyCourse.findUnique({
    where: { id },
    include: { chapters: {
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, title: true, order: true, isPublished: true, _count: { select: { lessons: true, quizzes: true } } },
    } },
  });
}

export async function getAdminChapter(courseId: string, id: string) {
  return prisma.zakatAcademyChapter.findFirst({
    where: { id, courseId },
    include: {
      course: { select: { id: true, title: true } },
      quizzes: {
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: { id: true, title: true, isPublished: true, isActive: true, _count: { select: { questions: true } } },
      },
      lessons: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: { id: true, title: true, order: true, isPublished: true, videoProvider: true, _count: { select: { attachments: true } } },
      },
    },
  });
}

export async function getAdminLesson(courseId: string, chapterId: string, id: string) {
  return prisma.zakatAcademyLesson.findFirst({
    where: { id, chapterId, chapter: { courseId } },
    include: {
      chapter: { select: { id: true, title: true } },
      attachments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
}

async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (retry < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
      throw error;
    }
  }
}

async function courseExists(tx: Prisma.TransactionClient, id: string) {
  const course = await tx.zakatAcademyCourse.findUnique({ where: { id }, select: { id: true } });
  if (!course) throw new AcademyError("Program tidak ditemukan.");
}

async function chapterExists(tx: Prisma.TransactionClient, courseId: string, id: string) {
  const chapter = await tx.zakatAcademyChapter.findFirst({ where: { id, courseId }, select: { id: true } });
  if (!chapter) throw new AcademyError("Bab tidak ditemukan pada program ini.");
}

async function lessonExists(tx: Prisma.TransactionClient, courseId: string, chapterId: string, id: string) {
  const lesson = await tx.zakatAcademyLesson.findFirst({ where: { id, chapterId, chapter: { courseId } }, select: { id: true } });
  if (!lesson) throw new AcademyError("Materi tidak ditemukan pada bab ini.");
}

async function requireNoEnrollments(tx: Prisma.TransactionClient, courseId: string) {
  const enrollment = await tx.zakatAcademyEnrollment.findFirst({ where: { courseId }, select: { id: true } });
  if (enrollment) throw new AcademyError("Program sudah memiliki peserta. Nonaktifkan publikasi konten agar riwayat belajar tetap terjaga.");
}

export async function saveCourse(id: string | null, form: FormData) {
  const data = courseInput(form);
  return id
    ? prisma.zakatAcademyCourse.update({ where: { id }, data, select: { id: true } })
    : prisma.zakatAcademyCourse.create({ data, select: { id: true } });
}

export async function saveChapter(courseId: string, id: string | null, form: FormData) {
  const data = chapterInput(form);
  return transaction(async (tx) => {
    await courseExists(tx, courseId);
    if (id) {
      await chapterExists(tx, courseId, id);
      return tx.zakatAcademyChapter.update({ where: { id }, data, select: { id: true } });
    }
    return tx.zakatAcademyChapter.create({ data: { ...data, courseId }, select: { id: true } });
  });
}

export async function saveLesson(courseId: string, chapterId: string, id: string | null, form: FormData) {
  const data = lessonInput(form);
  return transaction(async (tx) => {
    await chapterExists(tx, courseId, chapterId);
    if (id) {
      await lessonExists(tx, courseId, chapterId, id);
      return tx.zakatAcademyLesson.update({ where: { id }, data, select: { id: true } });
    }
    return tx.zakatAcademyLesson.create({ data: { ...data, chapterId }, select: { id: true } });
  });
}

export async function saveAttachment(courseId: string, chapterId: string, lessonId: string, id: string | null, form: FormData) {
  const data = attachmentInput(form);
  return transaction(async (tx) => {
    await lessonExists(tx, courseId, chapterId, lessonId);
    if (id) {
      const attachment = await tx.zakatAcademyLessonAttachment.findFirst({ where: { id, lessonId }, select: { id: true } });
      if (!attachment) throw new AcademyError("Lampiran tidak ditemukan pada materi ini.");
      return tx.zakatAcademyLessonAttachment.update({ where: { id }, data, select: { id: true } });
    }
    return tx.zakatAcademyLessonAttachment.create({ data: { ...data, lessonId }, select: { id: true } });
  });
}

export async function setContentOrder(courseId: string, chapterId: string, lessonId: string | null, order: number) {
  return transaction(async (tx) => {
    if (lessonId) {
      await lessonExists(tx, courseId, chapterId, lessonId);
      await tx.zakatAcademyLesson.update({ where: { id: lessonId }, data: { order } });
    } else {
      await chapterExists(tx, courseId, chapterId);
      await tx.zakatAcademyChapter.update({ where: { id: chapterId }, data: { order } });
    }
  });
}

export async function deleteContent(courseId: string, chapterId: string | null, lessonId: string | null) {
  await transaction(async (tx) => {
    await courseExists(tx, courseId);
    await requireNoEnrollments(tx, courseId);
    // FK Restrict turut melindungi progres, sertifikat, dan percobaan kuis.
    if (lessonId && chapterId) {
      await lessonExists(tx, courseId, chapterId, lessonId);
      await tx.zakatAcademyLesson.delete({ where: { id: lessonId } });
    } else if (chapterId) {
      await chapterExists(tx, courseId, chapterId);
      await tx.zakatAcademyChapter.delete({ where: { id: chapterId } });
    } else {
      await tx.zakatAcademyCourse.delete({ where: { id: courseId } });
    }
  });
}

export async function deleteAttachment(courseId: string, chapterId: string, lessonId: string, id: string) {
  await transaction(async (tx) => {
    await lessonExists(tx, courseId, chapterId, lessonId);
    const result = await tx.zakatAcademyLessonAttachment.deleteMany({ where: { id, lessonId } });
    if (!result.count) throw new AcademyError("Lampiran tidak ditemukan pada materi ini.");
  });
}
