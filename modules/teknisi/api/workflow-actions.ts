"use server";
import { apiRequest, ApiError } from "@/lib/api";
import { requireTechnicianUser } from "./access";
import { operationalRoot } from "./navigation";
import type { ActionState } from "../components/ActionForm";

export async function advanceService(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTechnicianUser();
  if (!user.canWrite) return {error: "Akun ini hanya dapat melihat data."};
  const destinations: Record<string, string> = {start:"repairing", complete:"ready", collect:"collected", cancel:"cancelled"};
  const operation = String(form.get("operation") ?? "");
  if (!destinations[operation]) return {error:"Tahap servis tidak valid."};
  // Browsers include an empty File for an unselected optional upload. Do not
  // forward that placeholder as an actual attachment (cash/free warranty).
  for (const name of ["beforePhoto","afterPhoto","paymentProof","handoverPhoto"]) {
    const file=form.get(name);
    if(file && typeof file!=="string" && file.size===0)form.delete(name);
  }
  try { await apiRequest("teknisi/workflow", {method:"POST", body:form}); }
  catch (error) {
    return {error: error instanceof ApiError ? Object.values(error.details ?? {}).flat().join(" ") || error.message : "Belum berhasil menyimpan. Isian tetap tersedia; coba lagi."};
  }
  // API reads are no-store. Revalidating the active layout here rerenders the
  // obsolete stage before the client can navigate, incorrectly producing a 404.
  return {success:"Tahap servis berhasil disimpan.", redirectTo:`${operationalRoot(user.role)}/tiket?status=${destinations[operation]}`};
}
