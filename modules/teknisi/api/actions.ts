"use server";
import { revalidatePath } from "next/cache";
import { getTechnicianUser } from "./access";
import * as service from "./service";
import type { ActionState } from "../components/ActionForm";
import { operationalRoot } from "./navigation";
import { ApiError } from "@/lib/api";

async function execute(form: FormData, operation: (user: NonNullable<Awaited<ReturnType<typeof getTechnicianUser>>>, form: FormData) => Promise<unknown>, refresh = true): Promise<ActionState> {
  const user = await getTechnicianUser();
  if (!user) return { error: "Akses ditolak. Silakan masuk dengan akun yang memiliki akses modul Teknisi HP." };
  try { await operation(user, form); }
  catch (error) {
    if(error instanceof ApiError) return {error:Object.values(error.details??{}).flat().join(" ")||error.message};
    return { error: error instanceof Error ? error.message : "Data gagal disimpan." };
  }
  if (refresh) {
    revalidatePath("/admin/teknisi", "layout");
    revalidatePath("/teknisi/panel", "layout");
  }
  return { success: "Data berhasil disimpan." };
}
export async function addOutlet(_: ActionState, form: FormData) { return execute(form, service.createOutlet); }
export async function addTechnician(_: ActionState, form: FormData) { return execute(form, service.saveTechnician); }
export async function addPart(_: ActionState, form: FormData) { return execute(form, service.createPart); }
export async function restock(_: ActionState, form: FormData) { return execute(form, service.restockPart); }
export async function consumePart(_: ActionState, form: FormData) { return execute(form, service.consumeSparepart); }
export async function addPartNeed(_: ActionState, form: FormData) { return execute(form, service.recordPartNeed); }
export async function changeTicket(_: ActionState, form: FormData) { return execute(form, service.updateTicket); }
export async function assignTicketParticipant(_: ActionState, form: FormData) { return execute(form, service.linkTicketParticipant); }
export async function addTicket(_: ActionState, form: FormData): Promise<ActionState> {
  let root = "/admin/teknisi";
  const result = await execute(form, async (user, data) => { root = operationalRoot(user.role); await service.createTicket(user, data); }, false);
  if (result.error) return result;
  return {success:"Servisan dibuat dan masuk Pending.", redirectTo:`${root}/tiket?status=received`};
}
