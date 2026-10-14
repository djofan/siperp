"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTechnicianUser } from "./access";
import { text,terminalStatuses } from "./policy";
import { createOutlet } from "./service";
import type { ActionState } from "../components/ActionForm";
export async function catalogAction(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireTechnicianUser();if(!user.canManage)return{error:"Hanya pengelola dapat mengubah outlet."};
 try{
  const mode=text(form,"mode");
  if(mode==="new")await createOutlet(user,form);
  else if(mode==="edit"){
   const id=text(form,"id"),isActive=form.get("isActive")==="on";
   await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM teknisi_outlets WHERE id = ${id} FOR UPDATE`;
    if(!isActive&&await tx.teknisiTicket.count({where:{outletId:id,status:{notIn:terminalStatuses}}}))throw new Error("Selesaikan semua servis sebelum menonaktifkan outlet.");
    await tx.teknisiOutlet.update({where:{id},data:{name:text(form,"name"),address:text(form,"address",1000),phone:text(form,"phone",30),isActive}});
   });
  }else throw new Error("Aksi tidak valid.");
 }catch(error){return{error:error instanceof Error?error.message:"Penyimpanan gagal."};}
 revalidatePath("/admin/teknisi","layout");revalidatePath("/teknisi/panel","layout");redirect("/admin/teknisi/outlet");
}
