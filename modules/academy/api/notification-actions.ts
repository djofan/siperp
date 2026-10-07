"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAcademyProfile } from "./access";
import { getExamNotifications } from "./notifications";
import type { ActionState } from "./actions";
export async function markReminderRead(key: string): Promise<ActionState> {
  const { profileId } = await requireAcademyProfile();
  if (!(await getExamNotifications(profileId)).some(item => item.key === key)) return { error: "Pengingat tidak tersedia." };
  await prisma.academyNotificationRead.upsert({ where: { profileId_key: { profileId, key } }, create: { profileId, key }, update: {} });
  revalidatePath("/academy", "layout");
  return { error: "", message: "Ditandai sudah dibaca." };
}
