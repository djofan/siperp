"use server";
import { apiRequest, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./actions";
export async function createCohort(_: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>("academy/admin/cohorts", { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
export async function setCohortRegistration(courseId: string, open: boolean): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(`academy/admin/courses/${encodeURIComponent(courseId)}/registration`, { method: "PUT", body: JSON.stringify({ open }) });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
