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
  const sections = [["diagnosis", "Diagnosis kerusakan"], ["treatment", "Tindakan pengerjaan"], ["changeReason", "Persetujuan / alasan perubahan"]] as const;
  if (sections.some(([key]) => form.has(key))) {
    const notes: string[] = [];
    for (const [key, label] of sections) {
      const value = String(form.get(key) ?? "").trim();
      if (value.length > 900) return {error: `${label} maksimal 900 karakter.`};
      if (value) notes.push(`${label}:\n${value}`);
      form.delete(key);
    }
    if (!notes.length) return {error: "Isi diagnosis, tindakan, atau alasan perubahan terlebih dahulu."};
    form.set("note", notes.join("\n\n"));
  }
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

export async function editOutletForm(id:string,_:ActionState,form:FormData):Promise<ActionState>{
  const user=await requireTechnicianUser();
  if(!user.canManage)return {error:"Hanya pengelola dapat mengedit outlet."};
  try{await apiRequest(`teknisi/outlets/${encodeURIComponent(id)}`,{method:"PATCH",body:form});}catch(error){return errorState(error);}
  return {success:"Outlet berhasil diperbarui.",redirectTo:"/admin/teknisi/outlet"};
}
