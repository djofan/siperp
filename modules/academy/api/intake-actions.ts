"use server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "./actions";
import { requireAcademyAdmin } from "./admin-access";
import { learningTransaction, lockIntake } from "./learning";
import { parseParticipantsCsv } from "./intake-policy";
import { normalizePhone } from "./policy";
import { quizDateInput } from "./admin-quiz-validation";
import { AcademyError } from "./errors";

export async function importParticipants(courseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try {
    const rows = parseParticipantsCsv(String(form.get("csv") ?? ""));
    const existing = await prisma.user.findMany({ where: { email: { in: rows.map(row => row.email) } }, select: { email: true } });
    const known = new Set(existing.map(user => user.email));
    const credentials = await Promise.all(rows.filter(row => !known.has(row.email)).map(async row => {
      const password = "Ia!" + randomBytes(12).toString("base64url");
      return { email: row.email, password, passwordHash: await bcrypt.hash(password, 12) };
    }));
    await learningTransaction(async tx => {
      // Serialize all imports with public registration/enrollment for this course.
      await tx.$queryRaw`SELECT id FROM zakat_academy_courses WHERE id = ${courseId} FOR UPDATE`;
      for (const row of rows) {
        let user = await tx.user.findUnique({ where: { email: row.email }, select: { id: true, isActive: true } });
        if (user && !user.isActive) throw new AcademyError("CSV memuat akun nonaktif. Periksa akun sebelum mengimpor.");
        const profile = user ? await tx.zakatAcademyProfile.findUnique({ where: { userId: user.id } }) : null;
        if (profile && (profile.phone && profile.phone !== row.phone || profile.gender && profile.gender !== row.gender)) throw new AcademyError("Data profil peserta yang sudah ada tidak cocok. Periksa CSV.");
        if (profile && await tx.zakatAcademyEnrollment.findUnique({ where: { profileId_courseId: { profileId: profile.id, courseId } } })) continue;
        await lockIntake(tx, courseId);
        if (!user) {
          const credential = credentials.find(item => item.email === row.email)!;
          user = await tx.user.create({ data: { name: row.name, email: row.email, passwordHash: credential.passwordHash }, select: { id: true, isActive: true } });
        }
        const saved = await tx.zakatAcademyProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, phone: row.phone, gender: row.gender, mustChangePassword: !known.has(row.email) }, update: { phone: row.phone, gender: row.gender } });
        await tx.zakatAcademyEnrollment.create({ data: { profileId: saved.id, courseId } });
      }
    });
    revalidatePath("/admin/academy/pendaftaran"); revalidatePath("/academy/daftar");
    return { error: "", message: "Impor berhasil. Akun lama mempertahankan passwordnya. Simpan password sementara akun baru dan bagikan secara pribadi.", credentials: credentials.map(({ email, password }) => ({ email, password })) };
  } catch (error) {
    if (error instanceof AcademyError || error instanceof Error && !error.name.startsWith("Prisma")) return { error: error.message };
    return { error: "Impor gagal. Periksa duplikasi email/WhatsApp atau koneksi database." };
  }
}

export async function setParticipantGroup(id: string, joined: boolean): Promise<ActionState> {
  await requireAcademyAdmin();
  await prisma.zakatAcademyEnrollment.update({ where: { id }, data: { groupJoinedAt: joined ? new Date() : null } });
  revalidatePath("/admin/academy/pendaftaran");
  return { error: "" };
}

export async function saveCourseSchedule(courseId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  const raw = String(form.get("startsAt") ?? "");
  const startsAt = raw ? new Date(raw + ":00+07:00") : null;
  if (startsAt && (!Number.isFinite(startsAt.getTime()) || quizDateInput(startsAt) !== raw)) return { error: "Tanggal mulai WIB tidak valid." };
  try {
    await learningTransaction(async tx => {
      await tx.$queryRaw`SELECT id FROM zakat_academy_courses WHERE id = ${courseId} FOR UPDATE`;
      const course = await tx.zakatAcademyCourse.findUniqueOrThrow({ where: { id: courseId }, select: { isSimulation: true, quota: true, startsAt: true, _count: { select: { enrollments: true } } } });
      if (startsAt && !course.isSimulation && course._count.enrollments < course.quota) throw new AcademyError("Tanggal mulai ditetapkan setelah kuota peserta terpenuhi.");
      if (course.startsAt && course.startsAt <= new Date() && startsAt?.getTime() !== course.startsAt.getTime()) throw new AcademyError("Tanggal program yang telah dimulai tidak dapat digeser.");
      await tx.zakatAcademyCourse.update({ where: { id: courseId }, data: { startsAt, durationDays: 30, teacher: "Ustadz Irham", quota: 200 } });
    });
    revalidatePath("/admin/academy/pendaftaran"); revalidatePath("/academy", "layout");
    return { error: "", message: "Jadwal program tersimpan." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Jadwal gagal disimpan." }; }
}

export async function saveLearningSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  const phone = normalizePhone(String(form.get("csPhone") ?? ""));
  const weights = ["daily_weight", "weekly_weight", "final_weight"].map(key => ({ key, value: Number(form.get(key)) }));
  if (!phone || weights.some(item => !Number.isInteger(item.value) || item.value < 0 || item.value > 100) || weights.reduce((sum,item) => sum + item.value,0) !== 100) return { error: "Nomor CS harus valid dan total bobot evaluasi harus 100%." };
  await prisma.$transaction([...weights.map(item => prisma.zakatAcademySetting.upsert({ where: { key: item.key }, create: { key: item.key, value: String(item.value) }, update: { value: String(item.value) } })), prisma.zakatAcademySetting.upsert({ where: { key: "cs_phone" }, create: { key: "cs_phone", value: phone }, update: { value: phone } })]);
  revalidatePath("/academy", "layout"); revalidatePath("/admin/academy/pengaturan");
  return { error: "", message: "Nomor CS dan bobot penilaian tersimpan." };
}
