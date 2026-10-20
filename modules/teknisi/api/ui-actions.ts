"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import { requireTechnicianUser } from "./access";
import { operationalRoot } from "./navigation";
import type { ActionState } from "../components/ActionForm";

function errorState(error:unknown):ActionState {
  if(error instanceof ApiError){const details=Object.values(error.details??{}).flat().join(" ");return {error:details||error.message};}
  return {error:"Penyimpanan belum berhasil. Silakan coba lagi."};
}
function refresh(){revalidatePath("/admin/teknisi","layout");revalidatePath("/teknisi/panel","layout");}
export async function updateService(_:ActionState,form:FormData):Promise<ActionState>{
  const user=await requireTechnicianUser();
  if(!user.canWrite)return {error:"Akun monitoring hanya dapat melihat data."};
  const id=String(form.get("ticketId")??"");
  try {await apiRequest("teknisi/tickets/update",{method:"POST",body:form});}
  catch(error){return errorState(error);}
  refresh();redirect(`${operationalRoot(user.role)}/tiket/${encodeURIComponent(id)}`);
}
export async function createOutletForm(_:ActionState,form:FormData):Promise<ActionState>{
  const user=await requireTechnicianUser();
  if(!user.canManage)return {error:"Hanya pengelola dapat membuat outlet."};
  try{await apiRequest("teknisi/outlets",{method:"POST",body:form});}catch(error){return errorState(error);}
  refresh();redirect("/admin/teknisi/outlet");
}
