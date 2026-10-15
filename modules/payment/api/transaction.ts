import "server-only";
import {apiRequest,apiCollection,ApiError} from "@/lib/api";
import type {PaymentTransaction} from "@/lib/domain";
export async function getTransactionStatus(id: string) {
  try { return await apiRequest<Pick<PaymentTransaction, "id" | "trackingCode" | "moduleSource" | "amount" | "adminFee" | "paymentMethod" | "status" | "createdAt" | "paidAt" | "gateway">>(`payment/status/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function listTransactionsBySource(moduleSource: string) { return apiCollection<PaymentTransaction & { donor: { name: string } }>(`payment/transactions?moduleSource=${encodeURIComponent(moduleSource)}`); }
