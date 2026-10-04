"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAcademyUser, requireAcademyProfile, requireAcademyUser, requireAcademyTeacher } from "./access";
import { getIntake, learningTransaction, lockIntake } from "./learning";
import { lessonReleased, normalizePhone, safeResourceUrl } from "./policy";
import { startQuiz, updateAttempt } from "./quizzes";
import { AcademyError } from "./errors";
import { requireAcademyAdmin } from "./admin-access";
import * as curriculum from "./admin-curriculum";
import { orderField } from "./admin-validation";
import * as adminQuizzes from "./admin-quizzes";
import * as participants from "./admin-participants";

export type ActionState = { error: string; message?: string; credentials?: { email: string; password: string }[] };

function errorState(error: unknown): ActionState {
  if (error instanceof AcademyError) return { error: error.message };
  console.error("Academy action failed", error instanceof Error ? error.name : "Unknown error");
  return { error: "Data belum dapat disimpan. Silakan coba lagi." };
}

export async function registerParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (name.length < 2 || name.length > 100 || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Isi nama dan alamat email yang valid." };
  if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) return { error: "Password minimal 10 karakter dan maksimal 72 byte." };
  if (password !== form.get("confirmPassword")) return { error: "Konfirmasi password tidak sama." };
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const gender = String(form.get("gender") ?? "");
  if (!phone || (gender !== "IKHWAN" && gender !== "AKHWAT")) return { error: "Isi nomor WhatsApp Indonesia dan jenis kelamin yang valid." };
  const { course } = await getIntake();
  if (!course) return { error: "Pendaftaran belum dibuka. Hubungi CS." };
  try {
    // Akun Core yang sudah ada tidak diambil alih dan tidak diberi akses admin.
    const passwordHash = await bcrypt.hash(password, 12);
    await learningTransaction(async tx => {
      await lockIntake(tx, course.id);
      await tx.user.create({ data: { name, email, passwordHash, academyProfile: { create: { phone, gender, enrollments: { create: { courseId: course.id } } } } } });
    });
  } catch (error) {
    if (error instanceof AcademyError) return { error: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Email atau nomor WhatsApp sudah terdaftar. Masuk menggunakan akun SIP Anda." };
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
    await learningTransaction(async (tx) => {
      const existing = user.academyProfile && await tx.zakatAcademyEnrollment.findUnique({ where: { profileId_courseId: { profileId: user.academyProfile.id, courseId } } });
      if (!existing) await lockIntake(tx, courseId);
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
    select: { slug: true, releaseDay: true, chapter: { select: { course: { select: { slug: true, startsAt: true } } } } },
  });
  if (!lesson) return { error: "Materi tidak tersedia untuk akun Anda." };
  if (!lessonReleased(lesson.chapter.course.startsAt, lesson.releaseDay)) return { error: "Materi belum dijadwalkan atau belum dibuka." };
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

export async function saveQuizAnswer(attemptId: string, questionId: string, optionId: string | string[]) {
  const { profileId } = await requireAcademyProfile();
  try { return { ...await updateAttempt(profileId, attemptId, { questionId, optionId }), error: "" }; }
  catch (error) { return { completed: false, ...errorState(error) }; }
}

export async function saveStudyNote(lessonId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { profileId } = await requireAcademyProfile();
  const content = String(form.get("content") ?? "").trim();
  if (content.length > 20000) return { error: "Catatan maksimal 20.000 karakter." };
  const lesson = await prisma.zakatAcademyLesson.findFirst({ where: { id: lessonId, isPublished: true,
    chapter: { isPublished: true, course: { isPublished: true, enrollments: { some: { profileId } } } } },
    select: { releaseDay: true, chapter: { select: { course: { select: { startsAt: true } } } } } });
  if (!lesson || !lessonReleased(lesson.chapter.course.startsAt, lesson.releaseDay)) return { error: "Materi belum tersedia." };
  await prisma.academyStudyNote.upsert({ where: { profileId_lessonId: { profileId, lessonId } }, create: { profileId, lessonId, content }, update: { content } });
  revalidatePath("/academy/catatan");
  return { error: "", message: "Catatan pribadi tersimpan." };
}

export async function changeAcademyPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getAcademyUser();
  if (!user) redirect("/academy/masuk");
  const current = String(form.get("currentPassword") ?? "");
  const next = String(form.get("password") ?? "");
  if (next.length < 10 || Buffer.byteLength(next, "utf8") > 72) return { error: "Password baru minimal 10 karakter, maksimal 72 byte." };
  if (next !== form.get("confirmPassword")) return { error: "Konfirmasi password tidak sama." };
  if (current === next) return { error: "Gunakan password baru yang berbeda." };
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account || !await bcrypt.compare(current, account.passwordHash)) return { error: "Password saat ini tidak sesuai." };
  const passwordHash = await bcrypt.hash(next, 12);
  try {
    await prisma.$transaction(async tx => {
      const changed = await tx.user.updateMany({ where: { id: user.id, isActive: true, passwordHash: account.passwordHash }, data: { passwordHash } });
      if (changed.count !== 1) throw new AcademyError("Akun berubah. Silakan masuk kembali.");
      await tx.zakatAcademyProfile.updateMany({ where: { userId: user.id }, data: { mustChangePassword: false } });
    });
  } catch (error) { return errorState(error); }
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect("/academy/masuk?password=1");
}

export async function askTeacher(courseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { profileId } = await requireAcademyProfile();
  const question = String(form.get("question") ?? "").trim();
  if (question.length < 10 || question.length > 3000) return { error: "Pertanyaan harus 10–3.000 karakter." };
  if (!await prisma.zakatAcademyEnrollment.findUnique({ where: { profileId_courseId: { profileId, courseId } } })) return { error: "Anda belum mengikuti program ini." };
  await prisma.academyDiscussion.create({ data: { courseId, profileId, question } });
  revalidatePath("/academy/tanya-jawab");
  return { error: "", message: "Pertanyaan dikirim. Pengajar akan menjawab melalui halaman ini." };
}

export async function answerParticipant(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyTeacher();
  const answer = String(form.get("answer") ?? "").trim();
  if (!answer || answer.length > 10000) return { error: "Jawaban wajib diisi, maksimal 10.000 karakter." };
  await prisma.academyDiscussion.update({ where: { id }, data: { answer, answeredAt: new Date() } });
  revalidatePath("/academy/pengajar"); revalidatePath("/academy/tanya-jawab");
  return { error: "", message: "Jawaban tersimpan." };
}

export async function saveTeacherAudio(lessonId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyTeacher();
  const videoUrl = safeResourceUrl(String(form.get("audioUrl") ?? "").trim());
  if (!videoUrl) return { error: "Gunakan URL HTTPS atau path audio lokal yang valid." };
  await prisma.zakatAcademyLesson.update({ where: { id: lessonId }, data: { videoProvider: "AUDIO", videoUrl, isPublished: false } });
  revalidatePath("/academy/pengajar");
  return { error: "", message: "Rekaman tersimpan sebagai draft untuk pemeriksaan superadmin." };
}

export async function saveTeacherSession(courseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyTeacher();
  const title = String(form.get("title") ?? "").trim();
  const raw = String(form.get("startsAt") ?? "");
  const startsAt = new Date(raw + ":00+07:00");
  const joinUrl = safeResourceUrl(String(form.get("joinUrl") ?? ""));
  if (!title || title.length > 191 || !joinUrl || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) || !Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) return { error: "Isi judul, waktu sesi mendatang dalam WIB, dan tautan HTTPS yang valid." };
  await prisma.academyLiveSession.create({ data: { courseId, title, startsAt, joinUrl } });
  revalidatePath("/academy/pengajar"); revalidatePath("/academy/tanya-jawab");
  return { error: "", message: "Jadwal sesi tersimpan dan terlihat oleh peserta program." };
}

export async function finishQuiz(attemptId: string) {
  const { profileId } = await requireAcademyProfile();
  try {
    const result = await updateAttempt(profileId, attemptId, undefined, true);
    revalidatePath("/academy", "layout");
    return { error: "", href: `/academy/kuis/${result.quizId}/hasil/${attemptId}` };
  } catch (error) { return { ...errorState(error), href: "" }; }
}

function adminError(error: unknown): ActionState {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { error: "Slug sudah digunakan. Pilih slug lain." };
    if (error.code === "P2003") return { error: "Konten memiliki riwayat belajar dan tidak dapat dihapus. Nonaktifkan publikasinya." };
    if (error.code === "P2025") return { error: "Konten tidak ditemukan. Muat ulang halaman." };
  }
  return errorState(error);
}

function refreshCurriculum() {
  revalidatePath("/admin/academy", "layout");
  revalidatePath("/academy", "layout");
}

export async function saveAcademyCourse(id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  let saved: { id: string };
  try { saved = await curriculum.saveCourse(id, form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(`/admin/academy/program/${saved.id}?tersimpan=1`);
}

export async function saveAcademyChapter(courseId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  let saved: { id: string };
  try { saved = await curriculum.saveChapter(courseId, id, form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(`/admin/academy/program/${courseId}/bab/${saved.id}?tersimpan=1`);
}

export async function saveAcademyLesson(courseId: string, chapterId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  let saved: { id: string };
  try { saved = await curriculum.saveLesson(courseId, chapterId, id, form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(`/admin/academy/program/${courseId}/bab/${chapterId}/materi/${saved.id}?tersimpan=1`);
}

export async function saveAcademyAttachment(courseId: string, chapterId: string, lessonId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await curriculum.saveAttachment(courseId, chapterId, lessonId, id, form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(`/admin/academy/program/${courseId}/bab/${chapterId}/materi/${lessonId}?tersimpan=1#lampiran`);
}

export async function reorderAcademyContent(courseId: string, chapterId: string, lessonId: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await curriculum.setContentOrder(courseId, chapterId, lessonId, orderField(form)); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  return { error: "" };
}

export async function deleteAcademyContent(courseId: string, chapterId: string | null, lessonId: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  if (form.get("confirm") !== "on") return { error: "Centang konfirmasi sebelum menghapus konten." };
  if (lessonId && !chapterId) return { error: "Bab materi tidak valid." };
  try { await curriculum.deleteContent(courseId, chapterId, lessonId); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(lessonId ? `/admin/academy/program/${courseId}/bab/${chapterId}` : chapterId ? `/admin/academy/program/${courseId}` : "/admin/academy/program");
}

export async function deleteAcademyAttachment(courseId: string, chapterId: string, lessonId: string, id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  if (form.get("confirm") !== "on") return { error: "Centang konfirmasi sebelum menghapus lampiran." };
  try { await curriculum.deleteAttachment(courseId, chapterId, lessonId, id); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(`/admin/academy/program/${courseId}/bab/${chapterId}/materi/${lessonId}?tersimpan=1#lampiran`);
}

function adminQuizPath(courseId: string, chapterId: string, quizId: string) {
  return `/admin/academy/program/${courseId}/bab/${chapterId}/kuis/${quizId}`;
}

export async function saveAcademyQuiz(courseId: string, chapterId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  let saved: { id: string };
  try { saved = await adminQuizzes.saveAdminQuiz(courseId, chapterId, id, form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(adminQuizPath(courseId, chapterId, saved.id) + "?tersimpan=1");
}

export async function saveAcademyQuestion(courseId: string, chapterId: string, quizId: string, id: string | null, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await adminQuizzes.saveAdminQuestion(courseId, chapterId, quizId, id, form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(adminQuizPath(courseId, chapterId, quizId) + "?tersimpan=1#pertanyaan");
}

export async function deleteAcademyQuestion(courseId: string, chapterId: string, quizId: string, id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  if (form.get("confirm") !== "on") return { error: "Centang konfirmasi penghapusan." };
  try { await adminQuizzes.deleteAdminQuestion(courseId, chapterId, quizId, id); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(adminQuizPath(courseId, chapterId, quizId) + "?tersimpan=1#pertanyaan");
}

export async function deleteAcademyQuiz(courseId: string, chapterId: string, quizId: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  if (form.get("confirm") !== "on") return { error: "Centang konfirmasi penghapusan." };
  try { await adminQuizzes.deleteAdminQuiz(courseId, chapterId, quizId); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect(`/admin/academy/program/${courseId}/bab/${chapterId}`);
}

export async function syncAcademyCompletion(enrollmentId: string): Promise<ActionState> {
  await requireAcademyAdmin();
  let record: { id: string };
  try { record = await participants.syncAdminCompletion(enrollmentId); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect("/admin/academy/sertifikat/" + record.id + "?tersimpan=1");
}

export async function saveAcademyCertificate(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await participants.saveAdminCertificate(id, form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect("/admin/academy/sertifikat/" + id + "?tersimpan=1");
}

export async function deleteAcademyCompletion(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  if (form.get("confirm") !== "on") return { error: "Centang konfirmasi penghapusan." };
  try { await participants.deleteAdminCompletion(id); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect("/admin/academy/sertifikat");
}

export async function saveAcademyMaintenance(_state: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await participants.saveAdminMaintenance(form); }
  catch (error) { return adminError(error); }
  refreshCurriculum();
  redirect("/admin/academy/pengaturan?tersimpan=1");
}
