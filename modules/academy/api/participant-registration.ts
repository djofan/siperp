"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createParticipantAccount } from "@/modules/core/participant-accounts";
import { editParticipantAccount, deleteParticipantAccount } from "@/modules/core/participant-management";
import { ApiError } from "@/lib/api";
import { requireAcademyAdmin } from "./admin-access";
import type { ActionState } from "./actions";
export async function registerAcademyParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try {
    const account = await createParticipantAccount("academy", form);
    revalidatePath("/admin/academy", "layout");
    return { error: "", message: `Peserta berhasil didaftarkan. NIP: ${account.nip}. Grup ditentukan sesuai gender. Bagikan NIP dan password awal kepada peserta.` };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    return { error: "Pendaftaran belum berhasil. Silakan coba lagi." };
  }
}
export async function editAcademyAccount(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await editParticipantAccount("academy", id, form); revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout"); }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Perubahan gagal. Periksa apakah nomor HP sudah digunakan." }; }
  const destination = "/admin/academy/peserta";
  redirect(`${destination}?disimpan=1&q=${encodeURIComponent(String(form.get("name") ?? "").trim())}`);
}
export async function deleteAcademyAccount(id: string): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await deleteParticipantAccount("academy", id); revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout"); return { error: "", message: "Akun dihapus. Riwayat belajar tetap tersimpan." }; }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Akun belum dapat dihapus." }; }
}
