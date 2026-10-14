"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTechnicianUser } from "./access";
import * as service from "./service";
import type { ActionState } from "../components/ActionForm";
import { Prisma } from "@/generated/prisma/client";
import { operationalRoot } from "./navigation";

async function execute(form: FormData, operation: (user: NonNullable<Awaited<ReturnType<typeof getTechnicianUser>>>, form: FormData) => Promise<unknown>): Promise<ActionState> {
  const user = await getTechnicianUser();
  if (!user) return { error: "Akses ditolak. Silakan masuk dengan akun yang memiliki akses modul Teknisi HP." };
  try { await operation(user, form); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { error: error.code === "P2002" ? "Data dengan kode tersebut sudah terdaftar." : "Data gagal disimpan. Muat ulang lalu coba lagi." };
    return { error: error instanceof Error ? error.message : "Data gagal disimpan." };
  }
  revalidatePath("/admin/teknisi", "layout");
  revalidatePath("/teknisi/panel", "layout");
  return { success: "Data berhasil disimpan." };
}
export async function addOutlet(_: ActionState, form: FormData) { return execute(form, service.createOutlet); }
export async function addTechnician(_: ActionState, form: FormData) { return execute(form, service.saveTechnician); }
export async function changeTicket(_: ActionState, form: FormData) { return execute(form, service.updateTicket); }
export async function assignTicketParticipant(_: ActionState, form: FormData) { return execute(form, service.linkTicketParticipant); }
export async function addTicket(_: ActionState, form: FormData): Promise<ActionState> {
  let id = "";
  let root = "/admin/teknisi";
  const result = await execute(form, async (user, data) => { root = operationalRoot(user.role); id = (await service.createTicket(user, data)).id; });
  if (result.error) return result;
  redirect(`${root}/tiket/${id}`);
}
