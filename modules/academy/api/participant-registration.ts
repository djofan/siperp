"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { createParticipantAccount } from "@/modules/core/participant-accounts";
import { editParticipantAccount, deleteParticipantAccount } from "@/modules/core/participant-management";
import { ParticipantError } from "@/modules/core/participant-policy";
import { requireAcademyAdmin } from "./admin-access";
import type { ActionState } from "./actions";
export async function registerAcademyParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try {
    const account = await createParticipantAccount("academy", form);
    revalidatePath("/admin/academy", "layout");
    return { error: "", message: `Peserta berhasil didaftarkan. NIP: ${account.nip}. Grup ditentukan sesuai gender. Bagikan NIP dan password awal kepada peserta.` };
  } catch (error) {
    if (error instanceof ParticipantError) return { error: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Nomor HP sudah terdaftar. Gunakan akun peserta yang sudah ada." };
    return { error: "Pendaftaran belum berhasil. Silakan coba lagi." };
  }
}
export async function editAcademyAccount(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await editParticipantAccount("academy", id, form); revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout"); }
  catch (error) { return { error: error instanceof ParticipantError ? error.message : "Perubahan gagal. Periksa apakah nomor HP sudah digunakan." }; }
  redirect(`/admin/academy/pendaftaran?disimpan=1&q=${encodeURIComponent(String(form.get("name") ?? "").trim())}`);
}
export async function deleteAcademyAccount(id: string): Promise<ActionState> {
  await requireAcademyAdmin();
  try { await deleteParticipantAccount("academy", id); revalidatePath("/admin/academy", "layout"); revalidatePath("/academy", "layout"); return { error: "", message: "Akun dihapus. Riwayat belajar tetap tersimpan." }; }
  catch (error) { return { error: error instanceof ParticipantError ? error.message : "Akun belum dapat dihapus." }; }
}
