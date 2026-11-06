"use server";
import { apiRequest, ApiError } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAcademyAdmin } from "./admin-access";
import { requireAcademyProfile } from "./access";
import type { ActionState } from "./actions";
import { prepareMaterialForm } from "./material-form";
export async function saveMaterial(id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  let result: { id: string };
  try { result = await apiRequest(`academy/admin/materials${id ? "/" + encodeURIComponent(id) : ""}`, { method: id ? "PUT" : "POST", body: prepareMaterialForm(form) }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Materi gagal disimpan." }; }
  revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout");
  if (!id) redirect(`/admin/academy/materi?cohort=${encodeURIComponent(String(form.get("cohortId") ?? ""))}&tersimpan=1`);
  redirect(`/admin/academy/materi/${result.id}?tersimpan=1`);
}
export async function deleteMaterial(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  if (form.get("confirm") !== "on") return { error: "Centang konfirmasi sebelum menghapus materi." };
  try { await apiRequest(`academy/admin/materials/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Materi gagal dihapus." }; }
  revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout"); redirect("/admin/academy/materi");
}
export async function startMaterial(id: string): Promise<ActionState> {
  await requireAcademyProfile();
  try { await apiRequest(`academy/materials/${encodeURIComponent(id)}/start`, { method: "POST" }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Materi belum bisa dibuka." }; }
  revalidatePath("/academy", "layout"); redirect(`/academy/materi/${id}`);
}

export async function createMaterialQuiz(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin(); let result: { id: string; courseId: string; chapterId: string };
  try { result = await apiRequest("academy/admin/material-quizzes", { method: "POST", body: form }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Ujian gagal disimpan." }; }
  revalidatePath("/admin/academy", "layout");
  redirect(`/admin/academy/program/${result.courseId}/bab/${result.chapterId}/kuis/${result.id}?tersimpan=1`);
}

export async function setMaterialPublication(id: string, published: boolean): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await apiRequest(`academy/admin/materials/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ isPublished: published }) }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Publikasi gagal disimpan." }; }
  revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout");
  return { error: "", message: published ? "Materi dipublikasikan." : "Materi menjadi draft." };
}

export async function duplicateMaterial(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin(); let result: { id: string };
  try { result = await apiRequest(`academy/admin/materials/${encodeURIComponent(id)}/duplicate`, { method: "POST", body: form }); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Duplikasi materi gagal." }; }
  revalidatePath("/admin/academy", "layout");
  redirect(`/admin/academy/materi/${result.id}?tersimpan=1`);
}
