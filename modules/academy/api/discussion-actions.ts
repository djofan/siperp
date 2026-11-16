"use server";
import { academyServerHref } from "@/modules/academy/pwa/server-navigation";
import { apiRequest, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./actions";

export async function askParticipantQuestion(_: ActionState, form: FormData): Promise<ActionState> {
  const courseId = String(form.get("courseId") ?? "");
  if (!courseId) return { error: "Pilih angkatan / program terlebih dahulu." };
  try { await apiRequest(`academy/courses/${encodeURIComponent(courseId)}/questions`, { method: "POST", body: form }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Pertanyaan gagal dikirim." }; }
  revalidatePath("/academy", "layout");
  redirect(await academyServerHref("/academy/tanya-jawab?saved=1"));
}
