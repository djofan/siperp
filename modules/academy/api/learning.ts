import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { AcademyError } from "./errors";
import { normalizePhone } from "./policy";

export const getLearningSettings = cache(async () => {
  const rows = await prisma.zakatAcademySetting.findMany({ where: { key: { in: ["cs_phone", "daily_weight", "weekly_weight", "final_weight"] } } });
  const values = new Map(rows.map(row => [row.key, row.value]));
  return { csPhone: normalizePhone(values.get("cs_phone") ?? "628111186626") ?? "628111186626",
    weights: { DAILY: Number(values.get("daily_weight") ?? 20), WEEKLY: Number(values.get("weekly_weight") ?? 30), FINAL: Number(values.get("final_weight") ?? 50) } };
});

export async function getIntake() {
  const course = await prisma.zakatAcademyCourse.findFirst({ where: { isPublished: true, isSimulation: false, registrationOpen: true, OR: [{ startsAt: null }, { startsAt: { gt: new Date() } }] }, orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, title: true, quota: true, startsAt: true, durationDays: true, teacher: true, _count: { select: { enrollments: true } } } });
  return { course, filled: course?._count.enrollments ?? 0, full: !!course && (course._count.enrollments >= course.quota || !!course.startsAt && course.startsAt <= new Date()) };
}

export async function learningTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 }); }
    catch (error) { if (retry < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue; throw error; }
  }
}

export async function lockIntake(tx: Prisma.TransactionClient, courseId: string) {
  await tx.$queryRaw`SELECT id FROM zakat_academy_courses WHERE id = ${courseId} FOR UPDATE`;
  const course = await tx.zakatAcademyCourse.findUnique({ where: { id: courseId }, select: { id: true, quota: true, startsAt: true, isPublished: true, registrationOpen: true, _count: { select: { enrollments: true } } } });
  if (!course?.isPublished) throw new AcademyError("Pendaftaran program belum tersedia.");
  if (!course.registrationOpen) throw new AcademyError("Pendaftaran angkatan ini ditutup.");
  if (course.startsAt && course.startsAt <= new Date()) throw new AcademyError("Program sudah dimulai. Pendaftaran angkatan ini ditutup.");
  if (course._count.enrollments >= course.quota) throw new AcademyError(`Kuota ${course.quota} peserta sudah terpenuhi. Pendaftaran ditutup.`);
  return course;
}
