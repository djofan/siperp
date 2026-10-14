"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTechnicianUser } from "./access";
import { operationalRoot } from "./navigation";
import { advanceService } from "./workflow-service";
import type { ActionState } from "../components/ActionForm";
export async function serviceAction(_: ActionState,form:FormData):Promise<ActionState>{
  const user=await requireTechnicianUser();
  try{await advanceService(user,form);}catch(error){return{error:error instanceof Error?error.message:"Penyimpanan gagal."};}
  revalidatePath("/admin/teknisi","layout");revalidatePath("/teknisi/panel","layout");
  redirect(`${operationalRoot(user.role)}/tiket/${encodeURIComponent(String(form.get("ticketId")))}`);
}
