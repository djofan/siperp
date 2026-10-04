"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAcademyTeacher } from "./access";
import { lessonInput } from "./admin-validation";
import { saveAdminQuiz, saveAdminQuestion } from "./admin-quizzes";
import { AcademyError } from "./errors";
import type { ActionState } from "./actions";
function failure(error: unknown): ActionState {
  return { error: error instanceof AcademyError ? error.message : "Data belum dapat disimpan. Coba kembali." };
}
export async function saveTeacherMaterial(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyTeacher();
  try {
    const chapterId = String(form.get("chapterId") ?? "");
    if (!await prisma.zakatAcademyChapter.findUnique({ where: { id: chapterId }, select: { id: true } })) throw new AcademyError("Pilih bab materi.");
    form.set("videoProvider", "AUDIO");
    if (id) {
      const existing = await prisma.zakatAcademyLesson.findUnique({ where: { id }, select: { slug: true, chapterId: true } });
      if (!existing || existing.chapterId !== chapterId) throw new AcademyError("Materi tidak ditemukan dalam bab ini.");
      form.set("slug", existing.slug);
    } else form.set("slug", `materi-${randomUUID()}`);
    const data = lessonInput(form);
    if (id) await prisma.zakatAcademyLesson.update({ where: { id }, data });
    else await prisma.zakatAcademyLesson.create({ data: { ...data, chapterId } });
  } catch (error) { return failure(error); }
  revalidatePath("/academy", "layout");
  return { error: "", message: "Materi tersimpan." };
}
export async function saveTeacherQuiz(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyTeacher();
  let saved: { id: string };
  try {
    const chapterId = String(form.get("chapterId") ?? "");
    const chapter = await prisma.zakatAcademyChapter.findUnique({ where: { id: chapterId }, select: { courseId: true } });
    if (!chapter) throw new AcademyError("Pilih bab ujian.");
    saved = await saveAdminQuiz(chapter.courseId, chapterId, id, form);
  } catch (error) { return failure(error); }
  revalidatePath("/academy", "layout");
  redirect(`/academy/pengajar/ujian/${saved.id}`);
}
export async function saveTeacherQuestion(quizId: string, questionId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyTeacher();
  try {
    const quiz = await prisma.zakatAcademyQuiz.findUnique({ where: { id: quizId }, select: { chapterId: true, chapter: { select: { courseId: true } } } });
    if (!quiz) throw new AcademyError("Ujian tidak ditemukan.");
    await saveAdminQuestion(quiz.chapter.courseId, quiz.chapterId, quizId, questionId, form);
  } catch (error) { return failure(error); }
  revalidatePath(`/academy/pengajar/ujian/${quizId}`);
  return { error: "", message: "Soal tersimpan." };
}
