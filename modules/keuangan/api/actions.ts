"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiRequest, ApiError } from "@/lib/api";

export type FinanceActionState = {error:string;message?:string};
export async function saveFinance(kind:"expense"|"decision"|"sources"|"categories"|"rule", id:string|null, _:FinanceActionState, form:FormData):Promise<FinanceActionState> {
  const text=(key:string)=>String(form.get(key)??"");
  let path:string,body:Record<string,unknown>,method:string;
  const requestId=text("requestId");
  switch(kind) {
    case "expense": path="expenses"+(id?"/"+encodeURIComponent(id):"");method=id?"PUT":"POST";body={requestId,sourceId:text("sourceId"),categoryId:text("categoryId"),recipient:text("recipient"),description:text("description"),amount:text("amount"),...(id?{version:text("version"),reason:text("reason")}:{})};break;
    case "decision": if(!id)return {error:"Penugasan tidak ditemukan."};path=`approvals/${encodeURIComponent(id)}/decisions`;method="POST";body={requestId,version:text("version"),decision:text("decision"),note:text("note")||null,reason:text("reason")||null};break;
    case "sources": case "categories":path="masters/"+kind;method="POST";body={requestId,name:text("name")};break;
    case "rule":path="approval-rules"+(id?"/"+encodeURIComponent(id):"");method=id?"PUT":"POST";body={requestId,minAmount:text("minAmount"),maxAmount:text("maxAmount"),approverIds:form.getAll("approverIds").map(String),active:form.get("active")==="on",...(id?{version:text("version")}:{})};break;
    default:return {error:"Aksi tidak tersedia."};
  }
  let result:{id:string};
  try {result=await apiRequest(`keuangan/${path}`,{method,body:JSON.stringify(body)});}
  catch(error){return {error:error instanceof ApiError?error.message:"Permintaan belum dapat dipastikan. Muat ulang dan periksa daftar sebelum membuat ulang."};}
  revalidatePath("/admin/keuangan","layout");
  if(kind==="expense")redirect(`/admin/keuangan/pengeluaran/${encodeURIComponent(result.id)}?saved=1`);
  if(kind==="decision")redirect(`/admin/keuangan/approval/${encodeURIComponent(result.id)}?saved=1`);
  redirect("/admin/keuangan/pengaturan?saved=1");
}
