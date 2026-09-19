import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const getAcademyUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { id: true, name: true, isSuperadmin: true },
  });
  if (!user) return null;
  const academyProfile = await getAcademyAvailability()
    ? await prisma.zakatAcademyProfile.findUnique({ where: { userId: user.id }, select: { id: true, nis: true } })
    : null;
  return { ...user, academyProfile };
});

export const getAcademyAvailability = cache(async () => {
  await connection();
  const academyModule = await prisma.module.findUnique({ where: { slug: "academy" }, select: { isActive: true } });
  // Registry belum di-seed: beranda tetap bisa dibaca tanpa mengakses tabel academy.
  if (!academyModule?.isActive) return false;
  const setting = await prisma.zakatAcademySetting.findUnique({ where: { key: "maintenance_mode" }, select: { value: true } });
  return setting?.value !== "true";
});

export async function requireAcademyAvailable() {
  if (!await getAcademyAvailability()) redirect("/academy/pemeliharaan");
}

export async function requireAcademyUser() {
  await requireAcademyAvailable();
  const user = await getAcademyUser();
  if (!user) redirect("/academy/masuk");
  return user;
}

export async function requireAcademyProfile() {
  const user = await requireAcademyUser();
  if (!user.academyProfile) redirect("/academy/program");
  return { ...user, profileId: user.academyProfile.id };
}
