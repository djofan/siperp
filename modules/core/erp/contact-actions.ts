"use server";
import {apiRequest,ApiError} from "@/lib/api";
import {revalidatePath} from "next/cache";
export type ErpActionState = {error?:string;message?:string};
export async function syncContacts(): Promise<ErpActionState> {try {const result=await apiRequest<ErpActionState>("super/erp/contacts/sync",{method:"POST"});revalidatePath("/admin/super","layout");return result;}catch(error){return {error:error instanceof ApiError ? error.message : "Data gagal disimpan."};}}
export async function saveContact(_: ErpActionState, form: FormData): Promise<ErpActionState> {try {const result=await apiRequest<ErpActionState>("super/erp/contacts",{method:"POST",body:form});revalidatePath("/admin/super","layout");return result;}catch(error){return {error:error instanceof ApiError ? error.message : "Data gagal disimpan."};}}
export async function mergeContacts(_: ErpActionState, form: FormData): Promise<ErpActionState> {try {const result=await apiRequest<ErpActionState>("super/erp/contacts/merge",{method:"POST",body:form});revalidatePath("/admin/super","layout");return result;}catch(error){return {error:error instanceof ApiError ? error.message : "Data gagal disimpan."};}}
