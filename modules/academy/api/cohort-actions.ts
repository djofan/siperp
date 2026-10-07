"use server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAcademyAdmin } from "./admin-access";
import { AcademyError } from "./errors";
import { fileExtensions, uploadRoot } from "./files";
import type { ActionState } from "./actions";
export async function createCohort(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  const { copyFile, mkdir, unlink } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  const title = String(form.get("title") ?? "").trim(), sourceId = String(form.get("sourceId") ?? "");
  if (title.length < 3 || title.length > 191) return { error: "Nama angkatan harus 3–191 karakter." };
  const copied: string[] = [];
  try {
    await prisma.$transaction(async tx => {
      const source = await tx.zakatAcademyCourse.findUnique({ where: { id: sourceId }, include: { chapters: { orderBy: { order: "asc" }, include: { lessons: { include: { attachments: true } }, quizzes: { include: { questions: { include: { options: true } } } } } } } });
      if (!source || source.isSimulation) throw new AcademyError("Pilih program resmi sebagai template.");
      const course = await tx.zakatAcademyCourse.create({ data: { title, slug: `angkatan-${randomUUID()}`, shortDescription: source.shortDescription, description: source.description, teacher: source.teacher, quota: 200, durationDays: 30, isPublished: false, registrationOpen: false, order: source.order + 1 } });
      for (const chapter of source.chapters) {
        const saved = await tx.zakatAcademyChapter.create({ data: { courseId: course.id, title: chapter.title, slug: chapter.slug, description: chapter.description, order: chapter.order, isPublished: chapter.isPublished } });
        for (const lesson of chapter.lessons) {
          const newId = randomUUID(); let videoUrl = lesson.videoUrl;
          const attachments = [];
          for (const file of lesson.attachments) {
            const fileId = randomUUID(); let fileUrl = file.fileUrl;
            if (file.fileUrl === `/api/academy/files/${file.id}` && file.fileType && fileExtensions[file.fileType]) {
              await mkdir(uploadRoot, { recursive: true });
              const target = path.join(/* turbopackIgnore: true */ uploadRoot, `${fileId}.${fileExtensions[file.fileType]}`);
              await copyFile(path.join(/* turbopackIgnore: true */ uploadRoot, `${file.id}.${fileExtensions[file.fileType]}`), target); copied.push(target);
              fileUrl = `/api/academy/files/${fileId}`;
              if (videoUrl === file.fileUrl) videoUrl = fileUrl;
            }
            attachments.push({ id: fileId, title: file.title, fileUrl, fileType: file.fileType, fileSize: file.fileSize });
          }
          await tx.zakatAcademyLesson.create({ data: { id: newId, chapterId: saved.id, title: lesson.title, slug: `materi-${newId}`, contentSummary: lesson.contentSummary, shortDescription: lesson.shortDescription, videoProvider: lesson.videoProvider, videoUrl, releaseDay: lesson.releaseDay, order: lesson.order, isPublished: lesson.isPublished, attachments: { create: attachments } } });
        }
        for (const quiz of chapter.quizzes) await tx.zakatAcademyQuiz.create({ data: { chapterId: saved.id, title: quiz.title, description: quiz.description, kind: quiz.kind, releaseDay: quiz.releaseDay, passingScore: quiz.passingScore, timeLimitMinutes: quiz.timeLimitMinutes, allowRetake: quiz.allowRetake, isPublished: false, isActive: false, questions: { create: quiz.questions.map(question => ({ question: question.question, explanation: question.explanation, type: question.type, weight: question.weight, order: question.order, options: { create: question.options.map(option => ({ label: option.label, isCorrect: option.isCorrect })) } })) } } });
      }
    }, { timeout: 60000 });
  } catch (error) { await Promise.all(copied.map(file => unlink(file).catch(() => {}))); return { error: error instanceof AcademyError ? error.message : "Angkatan gagal dibuat. Periksa kelengkapan file template." }; }
  revalidatePath("/admin/academy/angkatan");
  return { error: "", message: "Angkatan dibuat sebagai draft. Peserta, nilai, pertanyaan, sertifikat, dan tanggal lama tidak disalin." };
}
export async function setCohortRegistration(courseId: string, open: boolean): Promise<ActionState> {
  await requireAcademyAdmin();
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM zakat_academy_courses WHERE is_simulation = FALSE FOR UPDATE`;
      const course = await tx.zakatAcademyCourse.findUnique({ where: { id: courseId }, include: { _count: { select: { enrollments: true } } } });
      if (!course || course.isSimulation) throw new AcademyError("Angkatan resmi tidak ditemukan.");
      if (open && (course.startsAt && course.startsAt <= new Date() || course._count.enrollments >= course.quota)) throw new AcademyError("Angkatan sudah dimulai atau kuota terpenuhi.");
      if (open) await tx.zakatAcademyCourse.updateMany({ where: { isSimulation: false }, data: { registrationOpen: false } });
      await tx.zakatAcademyCourse.update({ where: { id: courseId }, data: { registrationOpen: open, ...(open ? { isPublished: true } : {}) } });
    });
  } catch (error) { return { error: error instanceof AcademyError ? error.message : "Status pendaftaran gagal disimpan." }; }
  revalidatePath("/academy", "layout"); revalidatePath("/admin/academy/angkatan");
  return { error: "", message: open ? "Pendaftaran dibuka untuk angkatan ini." : "Pendaftaran angkatan ditutup." };
}
