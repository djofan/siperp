"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import { requireAcademyAdmin } from "./admin-access";
import type { ActionState } from "./actions";

export async function answerAdminDiscussion(id: string, page: number, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try {
    await apiRequest(`academy/discussions/${encodeURIComponent(id)}/answer`, { method: "PUT", body: form });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Jawaban gagal disampaikan. Silakan coba lagi." };
  }
  revalidatePath("/admin/academy/pertanyaan", "layout");
  revalidatePath("/academy/tanya-jawab", "layout");
  revalidatePath("/academy/pengajar/pertanyaan", "layout");
  redirect(`/admin/academy/pertanyaan?saved=1&page=${Math.max(1, Math.min(100000, Math.trunc(page) || 1))}`);
}
