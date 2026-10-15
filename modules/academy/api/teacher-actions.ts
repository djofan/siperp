"use server";
import { apiRequest, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./actions";
export async function saveTeacherMaterial(id: string | null, _: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(id ? `academy/teacher/materials/${encodeURIComponent(id)}` : "academy/teacher/materials", { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
export async function saveTeacherQuiz(id: string | null, _: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(id ? `academy/teacher/quizzes/${encodeURIComponent(id)}` : "academy/teacher/quizzes", { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); redirect(`/academy/pengajar/ujian/${result.id}`); }
export async function saveTeacherQuestion(quizId: string, questionId: string | null, _: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(questionId ? `academy/teacher/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}` : `academy/teacher/quizzes/${encodeURIComponent(quizId)}/questions`, { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
