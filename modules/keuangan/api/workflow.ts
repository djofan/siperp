import "server-only";
import { notFound } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import type { FinanceDetail, FinanceOptions, FinanceSettings, FinancePage, FinanceExpense, FinanceApproval, FinanceApprovalDetail } from "@/contracts/modules/keuangan";

async function item<T>(path:string):Promise<T>{try{return await apiRequest<T>(path);}catch(error){if(error instanceof ApiError&&error.status===404)notFound();throw error;}}
export const getExpense = (id:string) => item<FinanceDetail>(`keuangan/expenses/${encodeURIComponent(id)}`);
export const getExpenseOptions = () => apiRequest<FinanceOptions>("keuangan/expense-options");
export const getSettings = () => apiRequest<FinanceSettings>("keuangan/settings");
export const getApproval = (id:string) => item<FinanceApprovalDetail>(`keuangan/approvals/${encodeURIComponent(id)}`);
export const getApprovals = (page:string) => apiRequest<FinancePage<FinanceApproval & {expense:FinanceExpense}>>(`keuangan/approvals?${new URLSearchParams({page})}`);
export const getExpenses = (search:string,page:string) => apiRequest<FinancePage<FinanceExpense>>(`keuangan/expenses?${new URLSearchParams({search,page})}`);
