"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAcademyAvailable, requireAcademyProfile, requireAcademyUser } from "./access";
import { startQuiz, updateAttempt } from "./quizzes";
import { AcademyError } from "./errors";

export type ActionState = { error: string };

function errorState(error: unknown): ActionState {
  if (error instanceof AcademyError) return { error: error.message };
  console.error("Academy action failed", error instanceof Error ? error.name : "Unknown error");
  return { error: "Data belum dapat disimpan. Silakan coba lagi." };
}

export async function registerParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAvailable();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (name.length < 2 || name.length > 100 || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Isi nama dan alamat email yang valid." };
  if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) return { error: "Password minimal 10 karakter dan maksimal 72 byte." };
  if (password !== form.get("confirmPassword")) return { error: "Konfirmasi password tidak sama." };
  try {
    // Akun Core yang sudah ada tidak diambil alih dan tidak diberi akses admin.
    await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), academyProfile: { create: {} } } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Email sudah terdaftar. Masuk menggunakan akun SIP Anda." };
    console.error("Academy registration failed", error instanceof Error ? error.name : "Unknown error");
    return { error: "Pendaftaran belum berhasil. Silakan coba lagi." };
  }
  redirect("/academy/masuk?terdaftar=1");
}

export async function enrollInCourse(courseId: string): Promise<ActionState> {
  const user = await requireAcademyUser();
  const course = await prisma.zakatAcademyCourse.findFirst({ where: { id: courseId, isPublished: true }, select: { slug: true } });
  if (!course) return { error: "Program tidak tersedia." };
  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.zakatAcademyProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
      await tx.zakatAcademyEnrollment.upsert({ where: { profileId_courseId: { profileId: profile.id, courseId } }, update: {}, create: { profileId: profile.id, courseId } });
    });
  } catch (error) { return errorState(error); }
  revalidatePath("/academy", "layout");
  redirect(`/academy/program/${course.slug}`);
}

export async function markLesson(lessonId: string, completed: boolean): Promise<ActionState> {
  const { profileId } = await requireAcademyProfile();
  const lesson = await prisma.zakatAcademyLesson.findFirst({
    where: { id: lessonId, isPublished: true, chapter: { isPublished: true, course: { isPublished: true, enrollments: { some: { profileId } } } } },
    select: { slug: true, chapter: { select: { course: { select: { slug: true } } } } },
  });
  if (!lesson) return { error: "Materi tidak tersedia untuk akun Anda." };
  try {
    await prisma.zakatAcademyLessonProgress.upsert({ where: { profileId_lessonId: { profileId, lessonId } },
      create: { profileId, lessonId, completed, completedAt: completed ? new Date() : null },
      update: { completed, completedAt: completed ? new Date() : null },
    });
  } catch (error) { return errorState(error); }
  revalidatePath("/academy", "layout");
  return { error: "" };
}

export async function beginQuiz(quizId: string): Promise<ActionState> {
  const { profileId } = await requireAcademyProfile();
  let attemptId: string;
  try { attemptId = await startQuiz(profileId, quizId); }
  catch (error) { return errorState(error); }
  redirect(`/academy/kuis/${quizId}/percobaan/${attemptId}`);
}

export async function saveQuizAnswer(attemptId: string, questionId: string, optionId: string) {
  const { profileId } = await requireAcademyProfile();
  try { return { ...await updateAttempt(profileId, attemptId, { questionId, optionId }), error: "" }; }
  catch (error) { return { completed: false, ...errorState(error) }; }
}

export async function finishQuiz(attemptId: string) {
  const { profileId } = await requireAcademyProfile();
  try {
    const result = await updateAttempt(profileId, attemptId, undefined, true);
    revalidatePath("/academy", "layout");
    return { error: "", href: `/academy/kuis/${result.quizId}/hasil/${attemptId}` };
  } catch (error) { return { ...errorState(error), href: "" }; }
}
