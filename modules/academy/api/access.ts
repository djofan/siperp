import { academyServerHref } from "@/modules/academy/pwa/server-navigation";
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { apiRequest, ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const getAcademyUser = cache(async () => {
  if (!await getSession()) return null;
  try { return await apiRequest<{ id: string; name: string; isSuperadmin: boolean; moduleAccess: { role: string }[]; academyProfile: { id: string; nis: string | null; mustChangePassword: boolean; deletedAt: null } | null; isTeacher: boolean }>("academy/viewer"); }
  catch (error) { if (error instanceof ApiError && [401, 403].includes(error.status)) return null; throw error; }
});

export const getAcademyAvailability = cache(async () => {
  await connection();
  return apiRequest<boolean>("academy/availability");
});

export async function requireAcademyAvailable() {
  if (!await getAcademyAvailability()) redirect(await academyServerHref("/academy/pemeliharaan"));
}

export async function requireAcademyUser() {
  await requireAcademyAvailable();
  const user = await getAcademyUser();
  if (!user) redirect(await academyServerHref("/academy/masuk"));
  return user;
}

export async function requireAcademyProfile() {
  const user = await requireAcademyParticipant();
  if (!user.academyProfile) redirect(await academyServerHref("/academy/program"));
  if (user.academyProfile.mustChangePassword) redirect(await academyServerHref("/academy/akun"));
  return { ...user, profileId: user.academyProfile.id };
}

export async function requireAcademyParticipant() {
  const user = await requireAcademyUser();
  if (user.isTeacher || user.isSuperadmin) redirect(await academyServerHref("/academy/pengajar"));
  return user;
}

export async function requireAcademyTeacher() {
  const user = await requireAcademyUser();
  if (!user.isSuperadmin && !user.isTeacher) redirect(await academyServerHref("/academy/belajar"));
  return user;
}
