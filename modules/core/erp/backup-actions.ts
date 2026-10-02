"use server";
import { requireSuperadmin } from "./access";
import { runBackup } from "./backup";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ErpActionState } from "./contact-actions";
export async function createErpBackup(): Promise<ErpActionState> {
  const actor = await requireSuperadmin();
  try {
    const result = await runBackup("create");
    if (Array.isArray(result)) throw new Error();
    await prisma.accessLog.create({ data: { message: `${actor.name} membuat backup ERP ${result.id}.` } });
    revalidatePath("/admin/super/backup");
    return { message: `Backup selesai: ${result.tables} tabel, ${result.rows} baris, ${result.files} file. Unduh dan simpan kunci secara terpisah di server.` };
  } catch { return { error: "Backup gagal atau melebihi batas proses. Periksa log server, ruang penyimpanan, konfigurasi kunci, dan create.lock sebelum mencoba lagi." }; }
}
export async function verifyErpBackup(_: ErpActionState, form: FormData): Promise<ErpActionState> {
  await requireSuperadmin();
  try {
    const result = await runBackup("verify", String(form.get("id") ?? ""));
    if (Array.isArray(result)) throw new Error();
    return { message: `Integritas valid: ${result.tables} tabel, ${result.rows} baris, ${result.files} file. Uji pemulihan ke database kosong tetap diperlukan.` };
  } catch { return { error: "Verifikasi gagal. File rusak, kunci tidak cocok, atau ID tidak valid." }; }
}
