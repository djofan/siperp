"use server";
import { apiRequest, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./actions";
export async function importParticipants(courseId: string, _: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(`academy/admin/courses/${encodeURIComponent(courseId)}/import`, { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
export async function setParticipantGroup(id: string, joined: boolean): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(`academy/admin/enrollments/${encodeURIComponent(id)}/group`, { method: "PUT", body: JSON.stringify({ joined }) });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
export async function saveCourseSchedule(courseId: string, _: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(`academy/admin/courses/${encodeURIComponent(courseId)}/schedule`, { method: "PUT", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
export async function saveLearningSettings(_: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>("academy/admin/settings/learning", { method: "PUT", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: result.message ?? "Data berhasil disimpan." }; }
