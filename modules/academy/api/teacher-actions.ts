"use server";
import { listReturn } from "../list-navigation";
import { apiRequest, ApiError } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "./actions";
export async function saveTeacherMaterial(id: string | null, _: ActionState, form: FormData): Promise<ActionState> { try {
    await apiRequest<ActionState & { id?: string }>(id ? `academy/teacher/materials/${encodeURIComponent(id)}` : "academy/teacher/materials", { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); redirect(`${listReturn("/academy/pengajar/materi", form.get("back"))}${listReturn("/academy/pengajar/materi", form.get("back")).includes("?") ? "&" : "?"}saved=${id ? "updated" : "created"}&visibility=${["1", "on", "true"].includes(String(form.get("isPublished"))) ? "published" : "draft"}`); }
export async function saveTeacherQuiz(id: string | null, _: ActionState, form: FormData): Promise<ActionState> { try {
    await apiRequest<ActionState & { id?: string }>(id ? `academy/teacher/quizzes/${encodeURIComponent(id)}` : "academy/teacher/quizzes", { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); redirect(`${listReturn("/academy/pengajar/ujian", form.get("back"))}${listReturn("/academy/pengajar/ujian", form.get("back")).includes("?") ? "&" : "?"}saved=${id ? "updated" : "created"}&visibility=${["1", "on", "true"].includes(String(form.get("isPublished"))) ? "published" : "draft"}`); }
export async function saveTeacherQuestion(quizId: string, questionId: string | null, _: ActionState, form: FormData): Promise<ActionState> { let result: ActionState & {
    id?: string;
}; try {
    result = await apiRequest<typeof result>(questionId ? `academy/teacher/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}` : `academy/teacher/quizzes/${encodeURIComponent(quizId)}/questions`, { method: "POST", body: form });
}
catch (error) {
    return { error: error instanceof ApiError ? error.message : "Data gagal disimpan." };
} revalidatePath("/academy", "layout"); revalidatePath("/admin/academy", "layout"); return { ...result, error: "", message: "Soal berhasil disimpan. Periksa kunci jawaban dan jumlah soal pada tabel sebelum mengaktifkan ujian." }; }


export async function answerTeacherDiscussion(id: string, page: number, _: ActionState, form: FormData): Promise<ActionState> {
  try { await apiRequest(`academy/discussions/${encodeURIComponent(id)}/answer`, { method: "PUT", body: form }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Jawaban gagal disimpan." }; }
  revalidatePath("/academy", "layout");
  const back = listReturn("/academy/pengajar/pertanyaan", form.get("back"));
  if (back.includes("?")) redirect(back + "&saved=1");
  redirect(`/academy/pengajar/pertanyaan?saved=1&page=${Math.max(1, Math.min(100000, Math.trunc(page) || 1))}`);
}


export async function createTeacherLiveSession(_: ActionState, form: FormData): Promise<ActionState> {
  const courseId = String(form.get("courseId") ?? "");
  if (!courseId) return { error: "Pilih angkatan / program terlebih dahulu." };
  try { await apiRequest(`academy/courses/${encodeURIComponent(courseId)}/sessions`, { method: "POST", body: form }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Jadwal gagal disimpan." }; }
  revalidatePath("/academy", "layout");
  redirect("/academy/pengajar/pertanyaan?tab=jadwal&saved=session");
}

export async function updateTeacherLiveSession(id: string, page: number, _: ActionState, form: FormData): Promise<ActionState> {
  try { await apiRequest(`academy/teacher/sessions/${encodeURIComponent(id)}`, { method: "PUT", body: form }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Perubahan jadwal gagal disimpan." }; }
  revalidatePath("/academy", "layout");
  redirect(`/academy/pengajar/pertanyaan?tab=jadwal&saved=session&page=${Math.max(1, Math.min(100000, page))}`);
}
