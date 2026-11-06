"use server";
import { apiRequest, ApiError } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAcademyAdmin } from "./admin-access";
import type { ActionState } from "./actions";
export async function saveExam(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  let result: { id: string; courseId: string; chapterId: string };
  try { result = await apiRequest(`academy/admin/exams${id ? "/" + encodeURIComponent(id) : ""}`, { method: "POST", body: form }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Ujian gagal disimpan." }; }
  revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout");
  redirect(`/admin/academy/program/${result.courseId}/bab/${result.chapterId}/kuis/${result.id}?tersimpan=1`);
}
