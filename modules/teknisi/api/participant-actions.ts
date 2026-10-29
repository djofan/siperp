"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createParticipantAccount } from "@/modules/core/participant-accounts";
import { editParticipantAccount, deleteParticipantAccount } from "@/modules/core/participant-management";
import { ApiError } from "@/lib/api";
import { requireTechnicianUser } from "./access";
import type { ActionState } from "../components/ActionForm";
export async function registerTeknisiParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTechnicianUser();
  if (!user.canManage) return { error: "Hanya admin atau manajer yang dapat mendaftarkan peserta." };
  try {
    const account = await createParticipantAccount("teknisi", form);
    revalidatePath("/admin/teknisi", "layout");
    return { success: `Teknisi berhasil didaftarkan. NIP: ${account.nip}. Gunakan NIP dan password awal untuk login di website Teknisi HP.` };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    return { error: "Pendaftaran belum berhasil. Silakan coba lagi." };
  }
}
export async function editTeknisiAccount(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireTechnicianUser();
  if (!user.canManage) return { error: "Hanya admin atau manajer yang dapat mengedit akun teknisi." };
  try { await editParticipantAccount("teknisi", id, form); revalidatePath("/admin/teknisi", "layout"); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Perubahan gagal. Periksa nomor HP dan penempatan outlet." }; }
  redirect(`/admin/teknisi/teknisi?disimpan=1&q=${encodeURIComponent(String(form.get("name") ?? "").trim())}`);
}
export async function deleteTeknisiAccount(id: string): Promise<ActionState> {
  const user = await requireTechnicianUser();
  if (!user.canManage) return { error: "Hanya admin atau manajer yang dapat menghapus akun teknisi." };
  try { await deleteParticipantAccount("teknisi", id); revalidatePath("/admin/teknisi", "layout"); return { success: "Akun dihapus. Riwayat servis tetap tersimpan." }; }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Akun belum dapat dihapus." }; }
}
