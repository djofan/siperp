"use server";
import {apiRequest,ApiError} from "@/lib/api";
import {revalidatePath} from "next/cache";
import type {ErpActionState} from "./contact-actions";
export async function createExpense(_: ErpActionState, form: FormData): Promise<ErpActionState> {try {const result=await apiRequest<ErpActionState>("super/erp/expenses",{method:"POST",body:form});revalidatePath("/admin/super","layout");return result;}catch(error){return {error:error instanceof ApiError ? error.message : "Data gagal disimpan."};}}
export async function importBankLines(_: ErpActionState, form: FormData): Promise<ErpActionState> {try {const result=await apiRequest<ErpActionState>("super/erp/bank-lines/import",{method:"POST",body:form});revalidatePath("/admin/super","layout");return result;}catch(error){return {error:error instanceof ApiError ? error.message : "Data gagal disimpan."};}}
export async function matchBankLine(_: ErpActionState, form: FormData): Promise<ErpActionState> {try {const result=await apiRequest<ErpActionState>("super/erp/bank-lines/match",{method:"POST",body:form});revalidatePath("/admin/super","layout");return result;}catch(error){return {error:error instanceof ApiError ? error.message : "Data gagal disimpan."};}}
export async function unmatchBankLine(_: ErpActionState, form: FormData): Promise<ErpActionState> {try {const result=await apiRequest<ErpActionState>("super/erp/bank-lines/unmatch",{method:"POST",body:form});revalidatePath("/admin/super","layout");return result;}catch(error){return {error:error instanceof ApiError ? error.message : "Data gagal disimpan."};}}
